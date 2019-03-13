/* global
  $: jQuery
  io: socket.io
  anychart: anychart component
  updateAnnotationsState: function, update annotations in app state
  contextMenuItemsFormatter: function, create context menu items for the annotations (remove and remove all)
*/
"use strict";

const socket = io(window.location.href);
const $strokeSettings = $('.strokeSettings'); // stroke settings controls
const $fontSize = $('#select-font-size'); // font size select
const $markerSize = $('#select-marker-size'); // marker size select
const $markerType = $('#select-marker-type'); // marker size select
const $fontSettings = $('#select-font-style'); // font style select
const $labelMethod = $('[data-label-method]'); //  font settings select
const $fillColorPicker = $('[data-color="fill"]'); // fill color picker
const $strokeColorPicker = $('[data-color="stroke"]'); // stroke color picker
const $fontColorPicker = $('[data-color="fontColor"]'); // font color picker
const $loader = $('#loader'); // anychart preloader
const $seriesTypeSelect = $('#seriesTypeSelect'); // series type select
const $indicatorTypeSelect = $('#indicatorTypeSelect'); // indicator type select
const $themeSelect = $('#themeSelect'); // theme select
const $resetBtn = $('.resetButton'); // app settings reset button
const chartContainer = 'chart-container'; // chart container id
const $annotationLabel = $('#annotation-label'); // input for the label text

// application state and common functions
const app = {
  createChart,
  removeChart,
  state: {
    indicators: [],
    annotations: [],
    settings: {}
  },
  seriesTypes: [
    'area',
    'column',
    'jump-line',
    'line',
    'marker',
    'spline',
    'spline-area',
    'step-area',
    'step-line',
    'stick',
    'range-area',
    'candlestick',
    'ohlc'
  ]
};

let chart, series, dataTable, mapping;
let timer = 0;
let secondCounter = null;

anychart.onDocumentReady(function() {
  // restore the app state from local storage, if exist
  if (localStorage.state) 
    app.state = JSON.parse(localStorage.state);

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

  // create chart
  app.createChart(chartContainer);

  /* when history data loaded, add data to the data table
    and render indicators, annotations and range picker */
  socket.on('loadData', data => {
    // create rangePicker
    const rangePicker = anychart.ui.rangePicker();
    if (Array.isArray(data)) {
      // handle data
      historyDataHandler(data);

      // restore indicators and annotations from app state
      drawIndicators(app.state.indicators);
      drawAnnotations(app.state.annotations);

      // dispose rangepicker, if exist
      if (rangePicker.getElement()) 
        rangePicker.dispose();
      
        // render rangepicker to the chart
      rangePicker.render(chart);
    }

    // send timerStart event to the server
    socket.emit('timerStart');
    timer = 0;
    //launch timer
    if (secondCounter == null) {
      secondCounter = setInterval(function() {
        timer += 1;
        chart.title(`EUR.FOREX data started from Jan 2000 and 1 minute ticker\nThe last update was: ${timer} seconds ago`);
      }, 1000);
    }

    $loader.hide();
  });

  // update chart with new data
  socket.on('realTimeData', data => {
    oneMinuteDataHandler(data);
  });

  // init series type select & theme select with data from the app state
  $seriesTypeSelect.val(app.state.settings.seriesType).selectpicker('refresh');
  $themeSelect.val(app.state.settings.theme || 'darkEarth').selectpicker('refresh');
});


/**
 * create chart and set it's settings
 * @param {string} container chart container
 * @param {boolean} updateChart update chart(true) or create new chart(false)
 */
function createChart(container) {
  // apply theme
  anychart.theme(app.state.settings.theme || 'darkEarth');
  
  // create and tune the chart
  chart = anychart.stock();

  // set chart's settings
  chart.padding(10, 50);
  chart.title('EUR.FOREX data started from Jan 2000 and 1 minute ticker\n');
  
  const plot = chart.plot();
  plot.legend(false);

  // adding extra Y axis to the right side
  plot.yAxis(1).orientation('right');

  // add annotation items in context menu
  chart.contextMenu().itemsFormatter(contextMenuItemsFormatter);

  //create chart series with selected series
  series = plot[app.state.settings.seriesType || 'candlestick']();

  // set series name
  series.name('EUR.FOREX');

  //set mapping to the series
  series.data(mapping);

  // render the chart
  chart.container(container).draw();

  // create range selector
  const rangeSelector = anychart.ui.rangeSelector();
  // render range selector to the chart
  rangeSelector.render(chart);

  // create scroller series
  chart.scroller().area(mapping);

  // restore indicators and annotations with settings from the app state
  drawIndicators(app.state.indicators);
  drawAnnotations(app.state.annotations);

  // restore selected range
  const {min, max} = app.state.settings.currentRange || {};
  chart.selectRange(min, max, true);
}


/**
 * show loader and remove chart
 */
function removeChart() {
  if (chart) {
    $loader.show();
    chart.dispose();
  }
}


/**
 * Draw Indicators using settings from app state
 * @param {Array} indicators array with indicators settings
 */
function drawIndicators(indicators) {
  for (const indicator of indicators) {
    // get type, settings and plot index of the indicator
    let {type, settings, plotIndex} = indicator;

    // if no plot index in the app state item, set plots count as plot index
    if (plotIndex === undefined) plotIndex = chart.getPlotsCount();

    // create new plot
    const plot = chart.plot(plotIndex);

    // for slow/fast stochastic use 'stochastic' type
    if (type.toLowerCase().includes('stochastic')) {
      plot['stochastic'].apply(plot, [mapping, ...settings]);
    } else {
      plot[type].apply(plot, [mapping, ...settings]);
    }
    // adding extra Y axis to the right side
    plot.yAxis(1).orientation('right');
  }

  // set indicator type select value and refresh selectpicker
  $indicatorTypeSelect.val(app.state.indicators.map(item => item.type)).selectpicker('refresh');
}


/**
 * draw annotations using settings from app state
 * @param {Array} annotations array with annotations settings
 */
function drawAnnotations(annotations) {
  for (const annotation of annotations) {
    if (annotation) {
      let plotIndex = annotations.indexOf(annotation);
      chart.plot(plotIndex).annotations().fromJson(annotation);
    }
  }
}


/**
 * @param {Array} data raw data from server
 */
function historyDataHandler(data) {
  // the last item in not a valid data point
  data.pop();
  //add data to the chart
  dataTable.addData(data);
}


/**
 * real-time data handler
 * @param {Object} data real-time data
 */
function oneMinuteDataHandler(data) {
  timer = 0;
  /* due to different data format provided
  by vendor for different subscriptions
  data needs to be formatted to any default view */
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
