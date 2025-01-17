library(shiny)
library(kanbanR)
library(bslib)
library(bsicons)
ui <- page_fluid(

  titlePanel("Kanban Board Test"),
  # textInput("new_list_name", "New List Name:", ""),
  # actionButton("add_list", "Add List"),
  # textInput("new_task_name", "New Task Name:", ""),
  # selectInput("select_list", "Select List:", choices = NULL),
  # actionButton("add_task", "Add Task"),
  kanbanOutput("kanban_board")
)



server <- function(input, output, session) {
  kanban_data <- reactiveVal(list(
    "To Do" = list(
      name = "To Do",
      items = list(
        list(
          id = "task1",
          title = "Task 1",
          subtitle = "Subtitle 1",
          color = "#ff0000"
        ),
        list(
          id = "task2",
          title = "Task 2",
          subtitle = "Subtitle 2",
          color = "#00ff00"
        )
      ),
      listPosition = 1
    ),
    "In Progress" = list(
      name = "In Progress",
      items = list(
        list(
          id = "task3",
          title = "Task 3",
          subtitle = "Subtitle 3",
          color = "#0000ff"
        )
      ),
      listPosition = 2
    )
  ))

  observeEvent(input$kanban_board, {
    new_list <- input$kanban_board
    new_list$`_timestamp` <- NULL
    kanban_data(new_list)
  })

  observe({
    current_data <- kanban_data()
    choices <-
      setNames(names(current_data),
               sapply(current_data, function(list)
                 list$name))
    updateSelectInput(session, "select_list", choices = choices)
  })

  observeEvent(input$add_list, {
    new_list_name <- input$new_list_name
    if (new_list_name != "") {
      current_data <- kanban_data()

      current_data[[new_list_name]] <- list(name = new_list_name,
                                            items = list())

      kanban_data(current_data)
      updateKanban(session, "kanban_board", data = current_data)
    }
  })


  observeEvent(input$add_task, {
    new_task_name <- input$new_task_name
    selected_list <- input$select_list

    if (new_task_name != "" &&
        selected_list %in% names(kanban_data())) {
      current_data <- kanban_data()
      new_task_id <- paste0("task_", Sys.time())
      current_data[[selected_list]]$items <- append(current_data[[selected_list]]$items,
                                                    list(list(id = new_task_id, content = new_task_name)))
      kanban_data(current_data)
      updateKanban(session, "kanban_board", data = current_data)
    }
  })

  selectedCard <- reactive({
    getSelectedCard("kanban_board")
  })


  output$kanban_board <- renderKanban({
    message("rendering")
    print(kanban_data())
    kanbanR(
      data = kanban_data()
    )
  })

}

shinyApp(ui, server)
