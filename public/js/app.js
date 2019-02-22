"use strict";

const socket = io('http://localhost:8081');
const $strokeSettings = $('.strokeSettings'); // stroke settings controls
const $fontSize = $('#select-font-size'); // font size select
const $markerSize = $('#select-marker-size'); // marker size select
const $markerType = $('#select-marker-type'); // marker size select
const $fontSettings = $('#select-font-style'); // font style select
const $labelMethod = $('[data-label-method]'); //  font settings select

let $annotationLabel, chart, series, dataTable, mapping;
let timer = 0;
let secondCounter = null;

// app cache
const app = {
  createChart: createChart,
  removeChart: removeChart,
  state: {
    indicators: [],
    annotations: [],
    settings: {}
  }
};

anychart.onDocumentReady(function () {
  // restore the app state from local storage, if exist
  if (localStorage.state) app.state = JSON.parse(localStorage.state);

  // create chart
  app.createChart(chartContainer);

  
  socket.on('loadData', data => {
    const rangePicker = anychart.ui.rangePicker();
    // history data
    if (Array.isArray(data)) {
      historyDataHandler(data);
      if (rangePicker.getElement()) rangePicker.dispose();
      rangePicker.render(chart);
    }

    // send timerStart event to the server
    socket.emit('timerStart');
    timer = 0;
    //launch timer
    if (secondCounter == null) {
      secondCounter = setInterval(function () {
        timer += 1;
        chart.title(`EUR.FOREX data started from Jan 2000 and 1 minute ticker\nThe last update was: ${timer} seconds ago`);
      }, 1000);
    }
  });

  // update chart with new data
  socket.on('realTimeData', data => {
    oneMinuteDataHandler(data);
  });

  // init series type select & theme select with data from application state
  $seriesTypeSelect.val(app.state.settings.chartType).selectpicker('refresh');
  $themeSelect.val(app.state.settings.theme || 'darkEarth').selectpicker('refresh');
});

/**
 * function to create chart and set it's settings
 * @param  {string} container chart container
 * @param  {boolean} updateChart flag to update chart(true) or create new chart(false)
 * @returns {void}
 */
function createChart(container, updateChart) {
  // apply theme
  anychart.theme(app.state.settings.theme || 'darkEarth');
  
  // create and tune the chart
  chart = anychart.stock();
  const plot = chart.plot();
  plot.legend(false);
  chart.title(
    'EUR.FOREX data started from Jan 2000 and 1 minute ticker\n'
  );

  //create chart series with selected series
  series = plot[app.state.settings.chartType || 'candlestick']();

  // set series name
  series.name('EUR.FOREX');

  if (!updateChart) {
    dataTable = anychart.data.table('Date');
    // map the data
    mapping = dataTable.mapAs({
      open: 'Open',
      high: 'High',
      low: 'Low',
      close: 'Close',
      value: 'Close',
      volume: 'Close'
    });

    //set mapping to the series
    series.data(mapping);
  }

  //render the chart
  chart.container(container).draw();

  // create range selector
  const rangeSelector = anychart.ui.rangeSelector();
  // init range selector
  rangeSelector.render(chart);

  chart.listen('annotationChange', updateAnnotationsState)
  chart.listen('annotationSelect', textEditHandler);

  // use annotation events to update application UI elements
  chart.listen('annotationSelect', onAnnotationSelect);
  chart.listen('annotationUnSelect', function () {
    $('.color-picker[data-color="fill"]').removeAttr('disabled');
    $('.select-marker-size').removeAttr('disabled');
    $('[data-action-type="removeSelectedAnnotation"]').addClass('disabled');
  });

  // add textarea for label annotation and listen events
  chart.listen('annotationDrawingFinish', function (e) {
    textEditHandler(e);
    if (e.annotation.type === 'label') {

      chart.listen('annotationDrawingFinish', function (e) {
        if (e.annotation.type === 'label') {
          $annotationLabel.val(e.annotation.text()).focus();
        }
      });

      chart.listen('annotationUnselect', function () {
        if (e.annotation.type === 'label') {
          $annotationLabel.val('');
        }
      });
    }
    updateAnnotationsState();
  });

  //data loaded event
  chart.listen('dataChanged', () => drawAnnotations(app.state.annotations));

  // add hidden text area for the labels text editing
  chart.listen('chartDraw', function () {
    const $body = $('body');
    const $textArea = '<textarea id="annotation-label"></textarea>';

    if (!$body.find('#annotation-label').length) {
      $body.find('[data-annotation-type="label"]').length ?
        $body.find('[data-annotation-type="label"]').after($textArea) :
        $body.append($textArea);
      $annotationLabel = $('#annotation-label');
    }
  });

  // update current range in app state
  chart.listen('selectedRangeChangeFinish', function() {
    app.state.settings.currentRange = [
      chart.xScale().getMinimum(),
      chart.xScale().getMaximum()
    ];
    $('.btn[data-action-type="saveAppState"]').removeClass('disabled');
  });

  if (updateChart) {
    setRange(app.state.settings.currentRange);

    //set mapping to both series
    series.data(mapping);
    // create scroller series
    chart.scroller().area(mapping);
    drawIndicators(app.state.indicators);
    return;
  }
}

/**
 * remove chart
 * @returns {void}
 */
function removeChart() {
  if (chart) {
    $loader.show();
    chart.dispose();
  }
}
/**
 * set chart range
 * @param  {Array} range array with min & max range values
 * @returns {void}
 */
function setRange(range) {
  if (range) {
    setTimeout(function () {
      chart.selectRange(...range, true);
    }, 10);
  }
}
/**
 * Draw Indicators using settings from app state
 * @param  {Object} indicators Object with indicators settings
 * @return {void}
 */
function drawIndicators(indicators) {
  let indicatorPlot;

  for (const indicator of indicators) {
    let {type, settings, plotIndex} = indicator;
    if (plotIndex === undefined) plotIndex = chart.getPlotsCount()
    indicatorPlot = chart.plot(plotIndex);
    // for slow/fast stochastic
    if (type.toLowerCase().includes('stochastic')) {
      indicatorPlot['stochastic'].apply(indicatorPlot, [mapping, ...settings]);
    } else {
      indicatorPlot[type].apply(indicatorPlot, [mapping, ...settings]);
    }
    // adding extra Y axis to the right side
    indicatorPlot.yAxis(1).orientation('right');
  }

  $indicatorTypeSelect.val(app.state.indicators.map(item => item.type)).selectpicker('refresh');
  setTimeout(function () {
    $loader.hide();
  }, 100);
}

function drawAnnotations(annotations) {
  for (const annotation of annotations) {
    if (annotation) {
      let plotIndex = annotations.indexOf(annotation);
      chart.plot(plotIndex).annotations().fromJson(annotation);
    }
  }
}

/**
 * handler for labels text edit
 * @param  {Event} e event object
 * @returns {void}
 */
function textEditHandler(e) {
  let annotation;
  if (e.annotation.type === 'label') {
    $annotationLabel
      .val(e.annotation.text())
      .focus()
      .on('change keyup paste', function (e) {
        if (e.keyCode === 46) return;
        annotation = chart.annotations().getSelectedAnnotation();
        if (annotation) {
          annotation.enabled();
          $(this).val() ?
            annotation.text($(this).val()) :
            annotation.text(' ') && $(this).val(' ');
          updateAnnotationsState();
        }
      });
  }
}

/**
 * @param  {Array} data raw data from server
 * @returns {void}
 */
function historyDataHandler(data) {
  // the last item in not a valid data point
  data.pop();
  //add data to OHLC chart
  dataTable.addData(data);

  drawIndicators(app.state.indicators);

  drawAnnotations(app.state.annotations);

  // add annotation items in context menu
  chart.contextMenu().itemsFormatter(contextMenuItemsFormatter);

  // create scroller series
  chart.scroller().area(mapping);

  setRange(app.state.settings.currentRange);

}

/**
 * real-time data handler
 * @param  {Object} data real-time data
 * @returns {void}
 */
function oneMinuteDataHandler(data) {
  timer = 0;
  /* due to different data format provided
      by vendor for different subscriptions
       // data needs to be formatted to any default view  */
  const oneMinData = {};
  oneMinData['Date'] = data.timestamp * 1000;
  oneMinData['Open'] = data.open;
  oneMinData['High'] = data.high;
  oneMinData['Low'] = data.low;
  oneMinData['Close'] = data.close;
  //add formatted data to OHLCV chart
  dataTable.addData([oneMinData]);

  // create scroller series
  chart.scroller().removeAllSeries();
  chart.scroller().area(mapping);
}
