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

  const defaultDeleteButtonStyle = {
    color: "white",
    backgroundColor: "red",
    icon: "🗑️",
  };
  const mergedDeleteButtonStyle = { ...defaultDeleteButtonStyle, ...deleteButtonStyle };

  useEffect(() => {
    if (window.Shiny) {
      elementIdRef.current = rootElement.current.parentElement.getAttribute(
        "data-kanban-output"
      );

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

  useEffect(() => {
    if (data) {
      console.log("Received updated data from Shiny:", data);
      setLists(data);
    }
  }, [data]);

   // Kart bilgilerini Shiny'ye gönder
  const updateShinyCardState = (cardDetails) => {
    const currentElementId =
      elementIdRef.current ||
      rootElement.current?.parentElement.getAttribute("data-kanban-output");

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

  const updateShiny = (updatedLists) => {
    const currentElementId =
      elementIdRef.current ||
      rootElement.current?.parentElement.getAttribute("data-kanban-output");

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

    const updatedLists = {
      ...lists,
      [listId]: newList,
    };

    const listsWithUpdatedPositions = updateListPositions(updatedLists);
    setLists(listsWithUpdatedPositions);
    updateShiny(listsWithUpdatedPositions);
    setNewListName("");
    setIsAddingList(false);
  };

  const deleteList = (listId) => {
    if (!window.confirm(`Are you sure you want to delete the list "${lists[listId].name}"?`)) {
      return;
    }

    const { [listId]: removed, ...remainingLists } = lists;
    const listsWithUpdatedPositions = updateListPositions(remainingLists);
    setLists(listsWithUpdatedPositions);
    updateShiny(listsWithUpdatedPositions);
  };

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

  const handleListNameEdit = (listId) => {
    setEditingListId(listId);
    setEditingListName(lists[listId].name);
  };

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

  const onDragEnd = (result) => {
    const { source, destination, type } = result;
    if (!destination) return;

    if (type === "LIST") {
      const listArray = Object.entries(lists);
      const [movedList] = listArray.splice(source.index, 1);
      listArray.splice(destination.index, 0, movedList);

      const updatedLists = Object.fromEntries(listArray);
      const listsWithUpdatedPositions = updateListPositions(updatedLists);
      setLists(listsWithUpdatedPositions);
      updateShiny(listsWithUpdatedPositions);
    } else if (type === "TASK") {
      const sourceColumn = lists[source.droppableId];
      const destColumn = lists[destination.droppableId];
      const sourceItems = Array.from(sourceColumn.items);
      const destItems = Array.from(destColumn.items);

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
              className="kanban-board row"
              style={{ display: "flex" }}
            >
              {Object.entries(lists).map(([listId, list], index) => (
                <Draggable key={listId} draggableId={listId} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="col-md-4 mb-3"
                    >
                      <div className="card border-primary shadow-sm kanban-column">
                        <div
                          {...provided.dragHandleProps}
                          className="card-header bg-primary text-white d-flex justify-content-between align-items-center"
                        >
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
                          <button
                            className="btn btn-sm p-0 border-0"
                            style={{
                              backgroundColor: "transparent",
                              color: "white",
                              cursor: "pointer",
                              fontSize: "1.5rem",
                            }}
                            onClick={() => deleteList(listId)}
                          >
                            {mergedDeleteButtonStyle.icon}
                          </button>
                        </div>
                        <Droppable droppableId={listId} type="TASK">
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="card-body bg-light"
                              style={{ minHeight: "200px" }}
                            >
                              {list.items.map((item, index) => (
                                <Draggable
                                  key={item.id}
                                  draggableId={item.id}
                                  index={index}
                                >
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className="card mb-2 shadow-sm kanban-item"
                                      onClick={() => handleCardClick(list.name, item)}
                                      style={{ cursor: "pointer" }}
                                    >
                                      <div className="card-body d-flex justify-content-between align-items-center">
                                        <div>
                                          <p className="card-text mb-1 font-weight-bold">
                                            {item.title}
                                          </p>
                                        </div>
                                        <button
                                          className="btn btn-sm"
                                          style={{
                                            color: mergedDeleteButtonStyle.color,
                                            backgroundColor:
                                              mergedDeleteButtonStyle.backgroundColor,
                                          }}
                                          onClick={() => deleteTask(listId, item.id)}
                                        >
                                          {mergedDeleteButtonStyle.icon}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
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
              <div className="col-md-4 mb-3">
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
