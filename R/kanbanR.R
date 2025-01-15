#' Kanban Board Widget
#'
#' Creates a Kanban Board for visualization and interaction.
#'
#' @param data A list representing the Kanban board structure.
#' @param width The width of the widget. Must be a valid CSS unit or `NULL`.
#' @param height The height of the widget. Must be a valid CSS unit or `NULL`.
#' @param elementId An optional ID for the widget element.
#'
#' @import htmlwidgets
#' @export
kanbanR <- function(data, deleteButtonStyle = list(
  color = "white",
  backgroundColor = "red",
  icon = "🗑️"
), width = NULL, height = NULL, elementId = NULL) {
  if (missing(data)) {
    stop("`data` must be provided to render the Kanban board.")
  }

  component <- reactR::reactMarkup(
    htmltools::tag("KanbanBoard", list(
      data = data,
      elementId = elementId,
      deleteButtonStyle = deleteButtonStyle
    ))
  )

  htmlwidgets::createWidget(
    name = "kanbanR",
    component,
    width = width,
    height = height,
    package = "kanbanR",
    elementId = elementId
  )
}


#' Called by HTMLWidgets to produce the widget's root element.
#' @noRd
widget_html.kanbanR <- function(id, style, class, ...) {
  htmltools::tagList(
    reactR::html_dependency_corejs(),
    reactR::html_dependency_react(),
    reactR::html_dependency_reacttools(),
    htmltools::tags$div(id = id, class = class, style = style)
  )
}
#
# update_kanban_board <- function(session, inputId, value, configuration = NULL) {
#   message <- list(value = value)
#   if (!is.null(configuration)) {
#     message$configuration <- configuration
#   }
#   session$sendInputMessage(inputId, message)
# }


is.tag <- function(x) {
  inherits(x, "shiny.tag")
}

isTagList <- function(x) {
  inherits(x, "shiny.tag.list") || (is.list(x) && all(sapply(x, is.tag)))
}


#' Shiny bindings for Kanban Board
#'
#' Output and render functions for using Kanban Board within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId Output variable to read from.
#' @param width,height Must be a valid CSS unit (like \code{'100\%'}, \code{'400px'}, \code{'auto'})
#'   or a number, which will be coerced to a string and have \code{'px'} appended.
#' @param expr An expression that generates a Kanban Board.
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name kanbanR-shiny
#' @export
kanbanROutput <- function(outputId, width = "100%", height = "400px") {
  output <- htmlwidgets::shinyWidgetOutput(outputId, "kanbanR", width, height, package = "kanbanR")
  # Add attribute to Shiny output containers to differentiate them from static widgets
  addOutputId <- function(x) {
    if (isTagList(x)) {
      x[] <- lapply(x, addOutputId)
    } else if (is.tag(x)) {
      x <- htmltools::tagAppendAttributes(x, "data-kanban-output" = outputId)
    }
    x
  }
  output <- addOutputId(output)
  print(output)
  output
}

#' @rdname kanbanR-shiny
#' @export
renderKanbanR <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # Force quoted expression
  htmlwidgets::shinyRenderWidget(expr, kanbanROutput, env, quoted = TRUE)
}


#' @export
updateKanban <- function(session, inputId, data) {
  session$sendCustomMessage(inputId, list(data = data))
}

#' @export
getSelectedCard <- function(outputId, session = NULL) {
  if (is.null(session)) {
    if (requireNamespace("shiny", quietly = TRUE)) {
      session <- shiny::getDefaultReactiveDomain()
    }
    if (is.null(session)) {
      # Not in an active Shiny session
      return(NULL)
    }
  }
  if (!is.character(outputId)) {
    stop("`outputId` must be a character string")
  }

  state <- session$input[[sprintf("%s__kanban__card", outputId)]]

  state
}


