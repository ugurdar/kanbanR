import { reactWidget } from "reactR";
import React, { useState, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

function KanbanBoard({ data, elementId: initialElementId, deleteButtonStyle }) {
  const [lists, setLists] = useState(data || {});
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [addingCardToListId, setAddingCardToListId] = useState(null);
  const [newCardTitle, setNewCardTitle] = useState("");
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

  // Shiny entegrasyonu: component yüklendiğinde custom message handler tanımla
  useEffect(() => {
    if (window.Shiny) {
      const parentAttr = rootElement.current?.parentElement?.getAttribute("data-kanban-output");
      if (parentAttr) elementIdRef.current = parentAttr;

      // Shiny'den gelebilecek özel mesajları dinleme
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

  // Bir karta tıklayınca Shiny'ye hangi kart olduğu bilgisini gönder
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

  // Lists güncellenince Shiny'ye gönder
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

  // Liste adını düzenleme
  const handleListNameEdit = (listId) => {
    setEditingListId(listId);
    setEditingListName(lists[listId].name);
  };

  // Liste adını kaydet
  const saveListName = (listId) => {
    if (!editingListName.trim()) return;

    const updatedLists = {
      ...lists,
      [listId]: {
        ...lists[listId],
        name: editingListName.trim(),
      },
    };
    setLists(updatedLists);
    updateShiny(updatedLists);
    setEditingListId(null);
    setEditingListName("");
  };

  // react-beautiful-dnd: sürükle-bırak işlemi bittiğinde
  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return; // iptal veya geçersiz bir durum

    if (type === "LIST") {
      // Listeleri yatay sürükleme
      const listArray = Object.entries(lists);
      const [movedList] = listArray.splice(source.index, 1);
      listArray.splice(destination.index, 0, movedList);

      const updatedLists = Object.fromEntries(listArray);
      const listsWithUpdatedPositions = updateListPositions(updatedLists);

      setLists(listsWithUpdatedPositions);
      updateShiny(listsWithUpdatedPositions);
    } else if (type === "TASK") {
      // Kartları sürükle-bırak
      const sourceColumn = lists[source.droppableId];
      const destColumn = lists[destination.droppableId];
      const sourceItems = [...sourceColumn.items];
      const destItems = [...destColumn.items];

      const [movedItem] = sourceItems.splice(source.index, 1);

      if (source.droppableId === destination.droppableId) {
        // Aynı liste içinde konum değişikliği
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
        // Farklı listeye taşı
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

        {/* Listelerin sürükleneceği alan. direction="horizontal" => Yatay sürükleme */}
        <Droppable droppableId="all-lists" direction="horizontal" type="LIST">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              // Bootstrap row yerine basit bir flex container
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",      // Listeler arasında boşluk
                overflowX: "auto" // İçerik geniş olursa yatay scroll
              }}
            >
              {/* Tüm liste sütunları */}
              {Object.entries(lists).map(([listId, list], index) => (
                <Draggable key={listId} draggableId={listId} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      // Liste sütununa sabit bir genişlik vs. verebilirsiniz:
                      style={{
                        width: "300px",
                        ...provided.draggableProps.style
                      }}
                    >
                      <div className="card border-primary shadow-sm kanban-column">
                        <div
                          {...provided.dragHandleProps} // Sürükleme sapı (drag handle)
                          className="card-header bg-primary text-white d-flex justify-content-between align-items-center"
                        >
                          {/* Liste adı düzenleme */}
                          {editingListId === listId ? (
                            <input
                              type="text"
                              value={editingListName}
                              onChange={(e) => setEditingListName(e.target.value)}
                              onBlur={() => saveListName(listId)}
                              autoFocus
                            />
                          ) : (
                            <h5
                              className="mb-0"
                              onClick={() => handleListNameEdit(listId)}
                              style={{ cursor: "pointer" }}
                            >
                              {list.name}
                            </h5>
                          )}

                          {/* Liste Silme Butonu */}
                          <button
                            className="btn btn-sm p-0 border-0"
                            style={{
                              backgroundColor: "transparent",
                              color: "white",
                              cursor: "pointer",
                              fontSize: "1.5rem",
                            }}
                            onClick={() => deleteList(listId)}
                            dangerouslySetInnerHTML={{
                              __html: mergedDeleteButtonStyle.listIcon
                            }}
                          />
                        </div>

                        {/* Bu listeye ait kartlar: direction="vertical" => dikey sürükleme */}
                        <Droppable droppableId={listId} type="TASK" direction="vertical">
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="card-body bg-light"
                              style={{ minHeight: "200px" }}
                            >
                              {/* Kartlar */}
                              {list.items.map((item, idx) => (
                                <Draggable
                                  key={item.id}
                                  draggableId={item.id}
                                  index={idx}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="card mb-2 shadow-sm kanban-item"
                                      onClick={() => handleCardClick(list.name, item)}
                                      style={{
                                        cursor: "pointer",
                                        ...provided.draggableProps.style
                                      }}
                                    >
                                      <div className="card-body d-flex justify-content-between align-items-center">
                                        <div>
                                          <p className="card-text mb-1 font-weight-bold">
                                            {item.title}
                                          </p>
                                        </div>
                                        {/* Kart silme butonu */}
                                        <button
                                          className="btn btn-sm"
                                          style={{
                                            color: mergedDeleteButtonStyle.color,
                                            backgroundColor:
                                              mergedDeleteButtonStyle.backgroundColor,
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation(); // Kart tıklama eventini engelle
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
                                <div className="mt-3">
                                  <input
                                    type="text"
                                    className="form-control mb-2"
                                    placeholder="Enter card title"
                                    value={newCardTitle}
                                    onChange={(e) => setNewCardTitle(e.target.value)}
                                  />
                                  <button
                                    className="btn btn-success btn-sm me-2"
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

              {/* Yeni liste ekleme butonu ya da alanı */}
              <div style={{ width: "300px" }}>
                {isAddingList ? (
                  <div className="card border-primary shadow-sm kanban-column">
                    <div className="card-body">
                      <div className="mb-3">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Enter List Name"
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                        />
                      </div>
                      <div className="btn-toolbar justify-content-between">
                        <button
                          className="btn btn-success"
                          onClick={addNewList}
                          style={{ flex: 1, marginRight: "5px" }}
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
                    className="btn btn-primary btn-block"
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
