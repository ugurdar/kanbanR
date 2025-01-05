import { reactWidget } from "reactR";
import React, { useState, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

function KanbanBoard({ data, elementId: initialElementId, deleteButtonStyle }) {
  const [lists, setLists] = useState(data || {});
  const [isAddingList, setIsAddingList] = useState(false); // Liste ekleme durumu
  const [newListName, setNewListName] = useState(""); // Yeni liste adı
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

  const listId = newListName.trim().toLowerCase().replace(/\s+/g, "-"); // Liste ismini anahtar olarak kullan
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
  setNewListName(""); // Input temizlenir
  setIsAddingList(false); // Liste ekleme durumu kapatılır
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
      return;
    }

    if (type === "TASK") {
      const sourceColumn = lists[source.droppableId];
      const destColumn = lists[destination.droppableId];
      const sourceItems = Array.from(sourceColumn.items);
      const destItems = Array.from(destColumn.items);

      if (source.droppableId === destination.droppableId) {
        const [moved] = sourceItems.splice(source.index, 1);
        sourceItems.splice(destination.index, 0, moved);

        const updatedLists = {
          ...lists,
          [source.droppableId]: { ...sourceColumn, items: sourceItems },
        };

        setLists(updatedLists);
        updateShiny(updatedLists);
        return;
      }

      const [moved] = sourceItems.splice(source.index, 1);
      destItems.splice(destination.index, 0, moved);

      const updatedLists = {
        ...lists,
        [source.droppableId]: { ...sourceColumn, items: sourceItems },
        [destination.droppableId]: { ...destColumn, items: destItems },
      };

      setLists(updatedLists);
      updateShiny(updatedLists);
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
                          className="card-header bg-primary text-white"
                        >
                          <h5 className="mb-0">{list.name}</h5>
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
                                    >
                                      <div className="card-body d-flex justify-content-between align-items-center">
                                        <div>
                                          <p className="card-text mb-1 font-weight-bold">
                                            {item.title}
                                          </p>
                                          <p className="card-text mb-1 text-muted">
                                            {item.subtitle}
                                          </p>
                                          <small>{item.content}</small>
                                        </div>
                                        <button
                                          className="btn btn-sm"
                                          style={{
                                            color: mergedDeleteButtonStyle.color,
                                            backgroundColor:
                                              mergedDeleteButtonStyle.backgroundColor,
                                          }}
                                        >
                                          {mergedDeleteButtonStyle.icon}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                              {provided.placeholder}
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
      <input
        type="text"
        className="form-control mb-2"
        placeholder="List Name"
        value={newListName}
        onChange={(e) => setNewListName(e.target.value)}
      />
      <button
        className="btn btn-success btn-block"
        onClick={addNewList}
      >
        Add
      </button>
      <button
        className="btn btn-secondary btn-block mt-2"
        onClick={() => setIsAddingList(false)}
      >
        Cancel
      </button>
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
