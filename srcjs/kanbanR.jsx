import { reactWidget } from "reactR";
import React, { useState, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

function KanbanBoard({ data, elementId: initialElementId, deleteButtonStyle }) {
  const [lists, setLists] = useState(data || {});
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [addingCardToListId, setAddingCardToListId] = useState(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  // Liste adını düzenlemek için
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState("");

  const rootElement = useRef(null);
  const elementIdRef = useRef(initialElementId);

  // İki ayrı ikon alanı: listIcon (liste silme), taskIcon (kart silme)
  const defaultDeleteButtonStyle = {
    color: "white",
    backgroundColor: "red",
    listIcon: "🗑️", // Listeleri silmek için varsayılan ikon (emoji)
    taskIcon: "🗑️", // Kartları silmek için varsayılan ikon (emoji)
  };
  const mergedDeleteButtonStyle = {
    ...defaultDeleteButtonStyle,
    ...deleteButtonStyle,
  };

  // Shiny entegrasyonu
  useEffect(() => {
    if (window.Shiny) {
      const parentAttr = rootElement.current?.parentElement?.getAttribute("data-kanban-output");
      if (parentAttr) elementIdRef.current = parentAttr;

      window.Shiny.addCustomMessageHandler(elementIdRef.current, (newData) => {
        console.log("Custom message received from Shiny:", newData);
        setLists(newData.data || {});
        const uniqueData = {
          ...newData.data,
          _timestamp: new Date().getTime(),
        };
        window.Shiny.setInputValue(elementIdRef.current, uniqueData);
      });
    }
  }, []);

  // Dışarıdan (Shiny) gelen data prop değişince listeyi güncelle
  useEffect(() => {
    if (data) {
      console.log("Received updated data from Shiny:", data);
      setLists(data);
    }
  }, [data]);

  // Bir karta tıklayınca Shiny'ye hangi kart olduğunu bildir
  const updateShinyCardState = (cardDetails) => {
    const currentElementId =
      elementIdRef.current ||
      rootElement.current?.parentElement?.getAttribute("data-kanban-output");

    if (window.Shiny && currentElementId) {
      const shinyInputId = `${currentElementId}__kanban__card`;
      try {
        console.log("Updating Shiny state with card details:", cardDetails);
        window.Shiny.setInputValue(shinyInputId, cardDetails);
      } catch (error) {
        console.error("Error updating Shiny state:", error);
      }
    } else {
      console.warn("Shiny environment or elementId not found.");
    }
  };

  const handleCardClick = (listName, card) => {
    const cardDetails = {
      listName,
      title: card.title,
      id: card.id,
    };
    console.log("Card clicked:", cardDetails);
    updateShinyCardState(cardDetails);
  };

  // Değişiklik olduğunda Shiny'ye gönder
  const updateShiny = (updatedLists) => {
    const currentElementId =
      elementIdRef.current ||
      rootElement.current?.parentElement?.getAttribute("data-kanban-output");

    if (window.Shiny && currentElementId) {
      const uniqueData = {
        ...updatedLists,
        _timestamp: new Date().getTime(),
      };
      console.log("Sending data to Shiny:", uniqueData);
      window.Shiny.setInputValue(currentElementId, uniqueData);
    } else {
      console.warn("Shiny environment or elementId not found.");
    }
  };

  // Listelerin sırasını güncelle
  const updateListPositions = (updatedLists) => {
    const listsWithUpdatedPositions = Object.entries(updatedLists).reduce(
      (acc, [listId, list], index) => {
        acc[listId] = { ...list, listPosition: index + 1 };
        return acc;
      },
      {}
    );
    return listsWithUpdatedPositions;
  };

  // Yeni liste ekle
  const addNewList = () => {
    if (!newListName.trim()) return;

    const listId = newListName;
    // Aynı isimli bir liste var mı?
    if (lists[listId]) {
      alert("A list with this name already exists. Please choose a different name.");
      return;
    }

    const newList = {
      name: newListName.trim(),
      items: [],
      listPosition: Object.keys(lists).length + 1,
    };

    const updatedLists = { ...lists, [listId]: newList };
    const listsWithUpdatedPositions = updateListPositions(updatedLists);

    setLists(listsWithUpdatedPositions);
    updateShiny(listsWithUpdatedPositions);
    setNewListName("");
    setIsAddingList(false);
  };

  // Liste sil
  const deleteList = (listId) => {
    if (!window.confirm(`Are you sure you want to delete the list "${lists[listId].name}"?`)) {
      return;
    }
    const { [listId]: removed, ...remainingLists } = lists;
    const listsWithUpdatedPositions = updateListPositions(remainingLists);

    setLists(listsWithUpdatedPositions);
    updateShiny(listsWithUpdatedPositions);
  };

  // Kart sil
  const deleteTask = (listId, taskId) => {
    const updatedItems = lists[listId].items.filter((item) => item.id !== taskId);
    const updatedLists = {
      ...lists,
      [listId]: {
        ...lists[listId],
        items: updatedItems,
      },
    };
    setLists(updatedLists);
    updateShiny(updatedLists);
  };

  // Yeni kart ekle
  const addNewCard = (listId) => {
    if (!newCardTitle.trim()) return;

    const newCard = {
      id: `${listId}-${new Date().getTime()}`,
      title: newCardTitle.trim(),
    };

    const updatedLists = {
      ...lists,
      [listId]: {
        ...lists[listId],
        items: [...lists[listId].items, newCard],
      },
    };

    setLists(updatedLists);
    updateShiny(updatedLists);
    setAddingCardToListId(null);
    setNewCardTitle("");
  };

  // Liste adı düzenleme moduna geç
  const handleListNameEdit = (listId) => {
    setEditingListId(listId);
    setEditingListName(lists[listId].name);
  };

  // (Yeni Eklendi) Liste adı düzenleme iptali
  const cancelListNameEdit = () => {
    setEditingListId(null);
    setEditingListName("");
  };

  // Liste adını kaydet (key'i değiştirecek şekilde)
  const saveListName = (oldListId) => {
  const newNameTrimmed = editingListName.trim();

  // 1) Kullanıcı liste adı girmediyse (boş bıraktıysa) iptal
  if (!newNameTrimmed) {
    // Düzenleme modundan çık, hiçbir değişiklik yapma
    setEditingListId(null);
    setEditingListName("");
    return;
  }

  // 2) Kullanıcı aslında hiçbir değişiklik yapmadı (eskisiyle aynı)
  if (newNameTrimmed === oldListId) {
    setEditingListId(null);
    setEditingListName("");
    return;
  }

  // 3) Başka listede aynı isim var mı?
  if (Object.keys(lists).some((k) => k !== oldListId && k === newNameTrimmed)) {
    alert("A list with this name already exists. Please choose a different name.");
    return;
  }

  // 4) Eski liste verisi + pozisyonu al
  const currentListData = lists[oldListId];
  const oldPos = currentListData.listPosition;

  // 5) Yeni bir key (newNameTrimmed) ile ekle, name alanını güncelle
  const updatedLists = { ...lists };
  updatedLists[newNameTrimmed] = {
    ...currentListData,
    name: newNameTrimmed,
    // İster aynı pozisyonu koru:
    listPosition: oldPos,
  };

  // 6) Eski key'i sil
  delete updatedLists[oldListId];

  // 7) Şimdi updatedLists'i array'e dönüştür, listPosition'a göre sırala
  const listArray = Object.entries(updatedLists);
  listArray.sort((a, b) => a[1].listPosition - b[1].listPosition);

  // (Opsiyonel) Tekrar 1'den N'e atamak isterseniz
  // listArray.forEach(([key, val], index) => {
  //   val.listPosition = index + 1;
  // });

  // 8) Objeye geri dönüştür
  const listsWithUpdatedPositions = Object.fromEntries(listArray);

  // 9) State ve Shiny güncelle
  setLists(listsWithUpdatedPositions);
  updateShiny(listsWithUpdatedPositions);

  // 10) Düzenleme modundan çık
  setEditingListId(null);
  setEditingListName("");
};


  // Sürükle-bırak bittiğinde
  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "LIST") {
      // Listeler (yatay) sürükleme
      const listArray = Object.entries(lists);
      const [movedList] = listArray.splice(source.index, 1);
      listArray.splice(destination.index, 0, movedList);

      const updatedLists = Object.fromEntries(listArray);
      const listsWithUpdatedPositions = updateListPositions(updatedLists);

      setLists(listsWithUpdatedPositions);
      updateShiny(listsWithUpdatedPositions);
    } else if (type === "TASK") {
      // Kartlar (dikey) sürükleme
      const sourceColumn = lists[source.droppableId];
      const destColumn = lists[destination.droppableId];
      const sourceItems = [...sourceColumn.items];
      const destItems = [...destColumn.items];

      const [movedItem] = sourceItems.splice(source.index, 1);

      if (source.droppableId === destination.droppableId) {
        sourceItems.splice(destination.index, 0, movedItem);
        const updatedLists = {
          ...lists,
          [source.droppableId]: {
            ...sourceColumn,
            items: sourceItems,
          },
        };
        setLists(updatedLists);
        updateShiny(updatedLists);
      } else {
        destItems.splice(destination.index, 0, movedItem);
        const updatedLists = {
          ...lists,
          [source.droppableId]: {
            ...sourceColumn,
            items: sourceItems,
          },
          [destination.droppableId]: {
            ...destColumn,
            items: destItems,
          },
        };
        setLists(updatedLists);
        updateShiny(updatedLists);
      }
    }
  };

  return (
    <div ref={rootElement}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="all-lists" direction="horizontal" type="LIST">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
                overflowX: "auto",
              }}
            >
              {Object.entries(lists).map(([listId, list], index) => (
                <Draggable key={listId} draggableId={listId} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={{
                        width: "300px",
                        ...provided.draggableProps.style,
                      }}
                    >
                      <div
                        style={{
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                          marginBottom: "1rem",
                          backgroundColor: "#fafafa",
                        }}
                      >
                        {/* Liste Başlık Alanı (Drag Handle + İsim) */}
                        <div
                          {...provided.dragHandleProps}
                          style={{
                            backgroundColor: "#007bff",
                            color: "#fff",
                            padding: "0.5rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          {/* EĞER düzenleme modundaysa input + save + cancel */}
                          {editingListId === listId ? (
                            <div style={{ flex: 1 }}>
                              <input
                                type="text"
                                className="form-control"
                                value={editingListName}
                                onChange={(e) => setEditingListName(e.target.value)}
                                style={{ marginBottom: "0.5rem" }}
                                autoFocus
                              />
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => saveListName(listId)}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={cancelListNameEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h5
                                style={{ margin: 0, cursor: "pointer" }}
                                onClick={() => handleListNameEdit(listId)}
                              >
                                {list.name}
                              </h5>
                              <button
                                className="btn btn-sm"
                                style={{
                                  backgroundColor: "transparent",
                                  color: "#fff",
                                  cursor: "pointer",
                                  fontSize: "1.3rem",
                                }}
                                onClick={() => deleteList(listId)}
                                dangerouslySetInnerHTML={{
                                  __html: mergedDeleteButtonStyle.listIcon,
                                }}
                              />
                            </>
                          )}
                        </div>

                        <Droppable droppableId={listId} type="TASK" direction="vertical">
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              style={{
                                minHeight: "150px",
                                padding: "0.5rem",
                                backgroundColor: "#f8f9fa",
                              }}
                            >
                              {list.items.map((item, idx) => (
                                <Draggable key={item.id} draggableId={item.id} index={idx}>
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      style={{
                                        backgroundColor: "#fff",
                                        border: "1px solid #ddd",
                                        borderRadius: "4px",
                                        padding: "0.5rem",
                                        marginBottom: "0.5rem",
                                        cursor: "pointer",
                                        ...provided.draggableProps.style,
                                      }}
                                      onClick={() => handleCardClick(list.name, item)}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                        }}
                                      >
                                        <div>
                                          <strong>{item.title}</strong>
                                        </div>
                                        <button
                                          className="btn btn-sm"
                                          style={{
                                            color: mergedDeleteButtonStyle.color,
                                            backgroundColor:
                                              mergedDeleteButtonStyle.backgroundColor,
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteTask(listId, item.id);
                                          }}
                                          dangerouslySetInnerHTML={{
                                            __html: mergedDeleteButtonStyle.taskIcon,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}

                              {/* Yeni kart ekleme alanı */}
                              {addingCardToListId === listId ? (
                                <div style={{ marginTop: "0.5rem" }}>
                                  <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Enter card title"
                                    value={newCardTitle}
                                    onChange={(e) => setNewCardTitle(e.target.value)}
                                    style={{ marginBottom: "0.5rem" }}
                                  />
                                  <button
                                    className="btn btn-success btn-sm"
                                    style={{ marginRight: "0.5rem" }}
                                    onClick={() => addNewCard(listId)}
                                  >
                                    Add Card
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setAddingCardToListId(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="btn btn-link btn-sm"
                                  onClick={() => setAddingCardToListId(listId)}
                                  style={{ marginTop: "0.5rem" }}
                                >
                                  + Add a card
                                </button>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {/* Yeni liste ekleme alanı */}
              <div style={{ width: "300px" }}>
                {isAddingList ? (
                  <div
                    style={{
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      backgroundColor: "#fafafa",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ padding: "0.5rem" }}>
                      <div style={{ marginBottom: "0.5rem" }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter List Name"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "0.5rem",
                        }}
                      >
                        <button
                          className="btn btn-success"
                          onClick={addNewList}
                          style={{ flex: 1 }}
                        >
                          Add
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setIsAddingList(false)}
                          style={{ flex: 1 }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    onClick={() => setIsAddingList(true)}
                  >
                    + Add List
                  </button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

reactWidget("kanbanR", "output", { KanbanBoard });
