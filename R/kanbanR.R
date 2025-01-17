#' Create a Kanban Board
#'
#' @param data Named list for the board
#' @param styleOptions Named list of style configs:
#'   \itemize{
#'     \item headerBg, headerColor, headerFontSize
#'     \item listNameFontSize
#'     \item cardTitleFontSize
#'     \item deleteList = list(backgroundColor, color, icon)
#'     \item deleteCard = list(backgroundColor, color, icon)
#'     \item addButtonText, cancelButtonText, addCardButtonText, cancelCardButtonText
#'   }
#' @param width,height widget dimension
#' @param elementId DOM id
#' @import bsicons
#' @import htmlwidgets
#' @return An htmlwidget
#' @export
kanbanR <- function(
    data,
    styleOptions = list(
      headerBg = "#007bff",
      headerColor = "#fff",
      headerFontSize = "1rem",
      listNameFontSize = "1rem",
      cardTitleFontSize = "1rem",
      deleteList = list(
        backgroundColor = "#007bff",
        color = "#fff",
        icon = bs_icon("x")
      ),
      deleteCard = list(
        backgroundColor = "#007bff",
        color = "#fff",
        icon = bs_icon("trash")
      ),
      addButtonText = "Add",
      cancelButtonText = "Cancel",
      addCardButtonText = "Add Card",
      cancelCardButtonText = "Cancel"
    ),
    width = NULL,
    height = NULL,
    elementId = NULL
) {
  if (missing(data)) {
    stop("`data` must be provided.")
  }

  component <- reactR::reactMarkup(
    htmltools::tag("KanbanBoard", list(
      data = data,
      elementId = elementId,
      styleOptions = styleOptions
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
#' @import reactR
#' @noRd
widget_html.kanbanR <- function(id, style, class, ...) {
  htmltools::tagList(
    reactR::html_dependency_corejs(),
    reactR::html_dependency_react(),
    reactR::html_dependency_reacttools(),
    htmltools::tags$div(id = id, class = class, style = style)
  )
}


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
#' @import htmlwidgets
#' @name kanbanR-shiny
#' @export
kanbanOutput <- function(outputId, width = "100%", height = "400px") {
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
#' @import htmlwidgets
#' @export
renderKanban <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # Force quoted expression
  htmlwidgets::shinyRenderWidget(expr, kanbanOutput, env, quoted = TRUE)
}


#' @export
updateKanban <- function(session, inputId, data) {
  session$sendCustomMessage(inputId, list(data = data))
}

#' @import shiny
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


