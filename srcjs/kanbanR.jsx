import { reactWidget } from "reactR";
import React, { useState, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "./kanbanR.css";

function KanbanBoard({ data, elementId: initialElementId, styleOptions = {} }) {
  const defaultStyleOptions = {
    headerBg: "#007bff",
    headerColor: "#fff",
    headerFontSize: "1rem",
    listNameFontSize: "1rem",
    cardTitleFontSize: "1rem",

    deleteList: {
      backgroundColor: "#dc3545",
      color: "#fff",
      icon: "<i class='bi bi-trash'></i>"
    },
    deleteCard: {
      backgroundColor: "#fd7e14",
      color: "#fff",
      icon: "<i class='bi bi-x-circle'></i>"
    },

    addButtonText: "Add",
    cancelButtonText: "Cancel",
    addCardButtonText: "Add Card",
    cancelCardButtonText: "Cancel"
  };

  // Merge user options
  const merged = { ...defaultStyleOptions, ...styleOptions };

  // React state
  const [lists, setLists] = useState(data || {});
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [addingCardToListId, setAddingCardToListId] = useState(null);
  const [newCardTitle, setNewCardTitle] = useState("");

  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState("");

  const rootElement = useRef(null);
  const elementIdRef = useRef(initialElementId);

  const [clickCounters, setClickCounters] = useState({});

  // Shiny integration
  useEffect(() => {
    if (window.Shiny) {
      const attr = rootElement.current?.parentElement?.getAttribute("data-kanban-output");
      if (attr) elementIdRef.current = attr;

      window.Shiny.addCustomMessageHandler(elementIdRef.current, (newData) => {
        setLists(newData.data || {});
        const uniqueData = { ...newData.data, _timestamp: new Date().getTime() };
        window.Shiny.setInputValue(elementIdRef.current, uniqueData);
      });
    }
  }, []);

  useEffect(() => {
    if (data) {
      setLists(data);
    }
  }, [data]);

  // Send to Shiny
  const updateShiny = (updated) => {
    const currentId =
      elementIdRef.current ||
      rootElement.current?.parentElement?.getAttribute("data-kanban-output");
    if (window.Shiny && currentId) {
      const uniqueData = { ...updated, _timestamp: Date.now() };
      window.Shiny.setInputValue(currentId, uniqueData);
    }
  };

  // Kart tıklama -> Shiny
  const handleCardClick = (listId, card, idx) => {
  const currentId = elementIdRef.current ||
    rootElement.current?.parentElement?.getAttribute("data-kanban-output");
  if (!currentId || !window.Shiny) return;

  // setClickCounters callback: en güncel "prev" state'i alır
  setClickCounters((prev) => {
    const oldCount = prev[card.id] || 0;
    const newCount = oldCount + 1;

    const cardDetails = {
      listName: listId,
      title: card.title,
      id: card.id,
      position: idx + 1,
      clickCount: newCount // <-- tıklama sayısı
    };

    const shinyInputId = `${currentId}__kanban__card`;
    window.Shiny.setInputValue(shinyInputId, cardDetails);

    return { ...prev, [card.id]: newCount };
  });
};

  // List position
  const updateListPositions = (updated) => {
    const res = Object.entries(updated).reduce((acc, [k, v], i) => {
      acc[k] = { ...v, listPosition: i + 1 };
      return acc;
    }, {});
    return res;
  };

  // + New List
  const addNewList = () => {
    if (!newListName.trim()) return;
    const listId = newListName;
    if (lists[listId]) {
      alert("A list with this name already exists!");
      return;
    }
    const newL = {
      name: newListName.trim(),
      items: [],
      listPosition: Object.keys(lists).length + 1,
    };
    const updated = { ...lists, [listId]: newL };
    const final = updateListPositions(updated);
    setLists(final);
    updateShiny(final);
    setNewListName("");
    setIsAddingList(false);
  };

  // Delete List
  const deleteList = (listId) => {
    if (!window.confirm(`Delete list "${lists[listId].name}"?`)) return;
    const { [listId]: removed, ...rest } = lists;
    const final = updateListPositions(rest);
    setLists(final);
    updateShiny(final);
  };

  // Delete Card
  const deleteTask = (listId, taskId) => {
    const newItems = lists[listId].items.filter((it) => it.id !== taskId);
    const updated = {
      ...lists,
      [listId]: {
        ...lists[listId],
        items: newItems
      }
    };
    setLists(updated);
    updateShiny(updated);
  };

  // + New Card
  const addNewCard = (listId) => {
    if (!newCardTitle.trim()) return;
    const newC = { id: `${listId}-${Date.now()}`, title: newCardTitle.trim() };
    const updated = {
      ...lists,
      [listId]: {
        ...lists[listId],
        items: [...lists[listId].items, newC]
      }
    };
    setLists(updated);
    updateShiny(updated);
    setAddingCardToListId(null);
    setNewCardTitle("");
  };

  // Liste adı düzenleme
  const handleListNameEdit = (listId) => {
    setEditingListId(listId);
    setEditingListName(lists[listId].name);
  };
  const cancelListNameEdit = () => {
    setEditingListId(null);
    setEditingListName("");
  };
  const saveListName = (oldListId) => {
    const newName = editingListName.trim();
    if (!newName) { cancelListNameEdit(); return; }
    if (newName === oldListId) { cancelListNameEdit(); return; }
    if (Object.keys(lists).some((k) => k !== oldListId && k === newName)) {
      alert("A list with this name already exists!");
      return;
    }
    const oldPos = lists[oldListId].listPosition;
    const updated = { ...lists };
    updated[newName] = {
      ...lists[oldListId],
      name: newName,
      listPosition: oldPos
    };
    delete updated[oldListId];

    const arr = Object.entries(updated).sort((a, b) => a[1].listPosition - b[1].listPosition);
    const finalObj = Object.fromEntries(arr);
    setLists(finalObj);
    updateShiny(finalObj);
    cancelListNameEdit();
  };

  // Drag & Drop
  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (type === "LIST") {
      const arr = Object.entries(lists);
      const [moved] = arr.splice(source.index, 1);
      arr.splice(destination.index, 0, moved);
      const obj = Object.fromEntries(arr);
      const final = updateListPositions(obj);
      setLists(final);
      updateShiny(final);
    } else if (type === "TASK") {
      const srcCol = lists[source.droppableId];
      const dstCol = lists[destination.droppableId];
      const srcItems = [...srcCol.items];
      const dstItems = [...dstCol.items];

      const [movedItem] = srcItems.splice(source.index, 1);
      if (source.droppableId === destination.droppableId) {
        srcItems.splice(destination.index, 0, movedItem);
        const updated = {
          ...lists,
          [source.droppableId]: { ...srcCol, items: srcItems }
        };
        setLists(updated);
        updateShiny(updated);
      } else {
        dstItems.splice(destination.index, 0, movedItem);
        const updated = {
          ...lists,
          [source.droppableId]: { ...srcCol, items: srcItems },
          [destination.droppableId]: { ...dstCol, items: dstItems },
        };
        setLists(updated);
        updateShiny(updated);
      }
    }
  };

  // CSS Variables
  const rootStyle = {
    "--kanban-header-bg": merged.headerBg,
    "--kanban-header-color": merged.headerColor,
    "--kanban-header-font-size": merged.headerFontSize,
    "--kanban-list-name-font-size": merged.listNameFontSize,
    "--kanban-card-title-font-size": merged.cardTitleFontSize,

    "--kanban-delete-list-bg": merged.deleteList.backgroundColor,
    "--kanban-delete-list-color": merged.deleteList.color,

    "--kanban-delete-card-bg": merged.deleteCard.backgroundColor,
    "--kanban-delete-card-color": merged.deleteCard.color
  };

  return (
    <div ref={rootElement} style={rootStyle}>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="all-lists" direction="horizontal" type="LIST">
          {(provided) => (
            <div className="kanban-board"
                 ref={provided.innerRef}
                 {...provided.droppableProps}
            >
              {Object.entries(lists).map(([listId, list], index) => (
                <Draggable key={listId} draggableId={listId} index={index}>
                  {(provided) => (
                    <div
                      className="kanban-list"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={provided.draggableProps.style}
                    >
                      <div className="kanban-list-header"
                           {...provided.dragHandleProps}
                      >
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
                            <div className="btn-group">
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => saveListName(listId)}
                              >
                                {merged.addButtonText}
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={cancelListNameEdit}
                              >
                                {merged.cancelButtonText}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <h5
                              className="kanban-list-title"
                              onClick={() => handleListNameEdit(listId)}
                            >
                              {list.name}
                            </h5>
                            <button
                              className="kanban-list-delete-btn btn btn-sm"
                              onClick={() => deleteList(listId)}
                              dangerouslySetInnerHTML={{
                                __html: merged.deleteList.icon,
                              }}
                            />
                          </>
                        )}
                      </div>

                      <Droppable droppableId={listId} type="TASK">
                        {(provided) => (
                          <div
                            className="kanban-list-body"
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {list.items.map((item, idx) => (
                              <Draggable key={item.id} draggableId={item.id} index={idx}>
                                {(provided) => (
                                  <div
                                    className="kanban-item"
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={provided.draggableProps.style}
                                    // Kart tıklama
                                    onClick={() => handleCardClick(listId, item, idx)}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                      <div>
                                        <strong>{item.title}</strong>
                                      </div>
                                      <button
                                        className="kanban-card-delete-btn btn btn-sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteTask(listId, item.id);
                                        }}
                                        dangerouslySetInnerHTML={{
                                          __html: merged.deleteCard.icon,
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}

                            {addingCardToListId === listId ? (
                              <div style={{ marginTop: "0.5rem" }}>
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
                                  {merged.addCardButtonText}
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setAddingCardToListId(null)}
                                >
                                  {merged.cancelCardButtonText}
                                </button>
                              </div>
                            ) : (
                              <div
                                className="kanban-add-card"
                                onClick={() => setAddingCardToListId(listId)}
                              >
                                +
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}

              {/* Yeni liste ekleme */}
              <div className="kanban-new-list">
                {isAddingList ? (
                  <div className="kanban-list">
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
                      <div className="btn-group" style={{ width: "100%" }}>
                        <button
                          className="btn btn-success"
                          style={{ flex: 1 }}
                          onClick={addNewList}
                        >
                          {merged.addButtonText}
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ flex: 1 }}
                          onClick={() => setIsAddingList(false)}
                        >
                          {merged.cancelButtonText}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    className="kanban-add-card"
                    onClick={() => setIsAddingList(true)}
                  >
                    +
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
