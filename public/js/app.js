var socket = io('http://localhost:8081');
var $strokeSettings = $('.strokeSettings');
var $annotationLabel;
var $fontSize = $('#select-font-size');
var $markerSize = $('#select-marker-size');
var $fontSettings = $('#select-font-style');
var $labelMethod = $('[data-label-method]');

var chart;
var dataTable;
var mapping;
var series;
var timer = 0;
var secondCounter = null;

var app = {
	createChart: createChart,
	removeChart: removeChart
};

var annotationsColor;

anychart.onDocumentReady(function() {
	app.createChart(chartContainer);

	// event to set chart type
	$seriesTypeSelect.on('change', function() {
		var type = $(this).val();

		// set chart type
		chart
			.plot()
			.getSeries(0)
			.seriesType(type);
		// save chart type
		appSettingsCache['chartType'] = type;
	});

	$('select.choose-drawing-tools, select.choose-marker').on('change', changeAnnotations);
	$('#newLabel').click(changeAnnotations);

	$('#annotation-label-autosize').on('click', function() {
		var annotation = chart.annotations().getSelectedAnnotation();

		if (annotation && annotation.type === 'label') {
			annotation.width(null);
			annotation.height(null);
		}

		$annotationLabel.focus();
	});

	function changeAnnotations() {
		var $that = $(this);

		setTimeout(function() {
			var $target = $that;
			var markerSize = $markerSize.val();
			var fontSize = $fontSize.val();
			var fontColor = $('[data-color="fontColor"]')
				.find('.color-fill-icon')
				.css('background-color');

			var colorFill = $('#fill .color-fill-icon').css('background-color');
			var colorStroke = $('#stroke .color-fill-icon').css('background-color');

			var strokeWidth = 1;
			var strokeDash;
			var annotation = chart.annotations().getSelectedAnnotation();

			strokeWidth = $strokeSettings.filter('.size').val();

			switch ($strokeSettings.filter('.dash').val()) {
				case 'solid':
					strokeDash = null;
					break;
				case 'dotted':
					strokeDash = `${strokeWidth} ${strokeWidth}`;
					break;
				case 'dashed':
					strokeDash = '10 5';
					break;
			}

			var strokeSettings = {
				thickness: strokeWidth,
				color: colorStroke,
				dash: strokeDash
			};

			var fontSettings = normalizeFontSettings($fontSettings.val());

			document.body.addEventListener('keydown', escape, {
				once: true
			});

			function escape(e) {
				if (e.keyCode === 27) {
					chart.annotations().cancelDrawing();
				}
			}

			var type = $target.data().annotationType;

			if (type === 'marker') {
				var markerType = $target.val();
			}

			if (type) {
				if ($target.data().annotationType === 'marker') {
					var markerAnchor = $target.find('option:selected').data()
						.markerAnchor;
				}

				var drawingSettings = {
					type: type === 'drawing' ? $target.val() : type,
					size: markerSize,
					color: annotationsColor,
					markerType: markerType,
					anchor: markerAnchor,
					fontSize: fontSize,
					fontColor: fontColor
				};

				$.extend(drawingSettings, fontSettings);

				if (type === 'label') {
					drawingSettings.anchor = fontSettings.anchor;

					drawingSettings.background = {
						fill: colorFill,
						stroke: strokeSettings
					};
					drawingSettings.hovered = {
						background: {
							stroke: strokeSettings
						}
					};
					drawingSettings.selected = {
						background: {
							stroke: strokeSettings
						}
					};
				} else {
					drawingSettings.fill = {};
					drawingSettings.fill.color = colorFill;
					drawingSettings.fill.opacity = 0.3;
					drawingSettings.stroke = strokeSettings;
					drawingSettings.hovered = {
						stroke: strokeSettings
					};
					drawingSettings.selected = {
						stroke: strokeSettings
					};
				}
				chart.annotations().startDrawing(drawingSettings);
			}

			var annotation = chart.annotations().getSelectedAnnotation();

			updatePropertiesBySelectedAnnotation(strokeWidth, strokeDash);

			if (
				annotation &&
				annotation.fill === undefined &&
				(!annotation.background || annotation.background().fill === undefined)
			) {
				$('#fill').attr('disabled', 'disabled');
			} else {
				$('#fill').removeAttr('disabled');
			}
		}, 1);
	}

	$('.btn[data-toolbar-type]').click(function() {
		var toolbarType = $(this).data().toolbarType;
		selectTools(toolbarType);
	});

	$('.btn[data-action-type]').click(function(evt) {
		var annotation = chart.annotations().getSelectedAnnotation();
		var $target = $(evt.currentTarget);
		$target.blur();
		var type = $target.attr('data-action-type');

		switch (type) {
			case 'removeAllAnnotations':
				removeAllAnnotation();
				break;
			case 'removeSelectedAnnotation':
				removeSelectedAnnotation();
				break;
			case 'unSelectedAnnotation':
				chart
					.annotations()
					.unselect(annotation)
					.cancelDrawing();
				break;
			case 'saveAnno':
				var json;
				json = chart
					.plot(0)
					.annotations()
					.toJson(true);
				localStorage.setItem('annotationsList0', json);
				for (var key in appSettingsCache['indicators']) {
					var plotIndex = appSettingsCache['indicators'][key].plotIndex;
					json = chart
						.plot(plotIndex)
						.annotations()
						.toJson(true);
					localStorage.setItem('annotationsList' + plotIndex, json);
				}

				$(evt.currentTarget).addClass('disabled');
				break;
		}
	});

	$strokeSettings.on('change', function() {
		var strokeWidth = 1;
		var strokeType;

		strokeWidth = $strokeSettings.filter('.size').val();
		strokeType = $strokeSettings.filter('.dash').val();
		updatePropertiesBySelectedAnnotation(strokeWidth, strokeType);
	});

	$markerSize.on('change', function() {
		var annotation = chart.annotations().getSelectedAnnotation();

		if (annotation === null) return;

		if (annotation.type === 'marker') {
			annotation.size($(this).val());
		}
	});

	$('#select-font-size').on('change', function() {
		var annotation = chart.annotations().getSelectedAnnotation();

		if (annotation === null) return;

		if (annotation.type === 'label') {
			annotation.fontSize($(this).val());
		}
	});

	$fontSettings.on('change', function() {
		var annotation = chart.annotations().getSelectedAnnotation();

		if (annotation && annotation.type === 'label') {
			var fontSettings = normalizeFontSettings($(this).val());

			$labelMethod.each(function() {
				var method = $(this).data().labelMethod;

				annotation[method](fontSettings[method]);
			});

			$annotationLabel.focus();
		}
	});

	$('html').keyup(function(e) {
		if (e.keyCode === 93 || e.keyCode === 46) {
			removeSelectedAnnotation();
		}
	});
});

function createChart(container, updateChart) {
	// apply theme
	anychart.theme(theme);

	// create and tune the chart
	chart = anychart.stock();
	var plot = chart.plot();
	plot.legend(false);
	chart.title(
		'EUR.FOREX data started from Jan 2000 and 1 minute ticker\nThe last update was:'
	);

	//create OHLC series
	series = plot.candlestick();

	series.name('EUR.FOREX');

	series.legendItem({
		iconEnabled: false
	});

	//render the chart
	chart.container(container).draw();

	// create range selector
	var rangeSelector = anychart.ui.rangeSelector();
	// init range selector
	rangeSelector.render(chart);

	var rangePicker = anychart.ui.rangePicker();

	//get saved annotations from the 0 plot
	var ChartStore = localStorage.getItem('annotationsList0');
	chart
		.plot()
		.annotations()
		.fromJson(ChartStore);
	// add annotation items in context menu
	chart.contextMenu().itemsFormatter(contextMenuItemsFormatter);

	// use annotation events to update application UI elements
	chart.listen('annotationDrawingFinish', onAnnotationDrawingFinish);
	chart.listen('annotationSelect', onAnnotationSelect);
	chart.listen('annotationUnSelect', function() {
		$('.color-picker[data-color="fill"]').removeAttr('disabled');
		$('.select-marker-size').removeAttr('disabled');
		$('[data-action-type="removeSelectedAnnotation"]').addClass('disabled');
	});

	// add textarea for label annotation and listen events
	chart.listen('annotationDrawingFinish', function(e) {
		if (e.annotation.type === 'label') {
			$annotationLabel
				.val(e.annotation.text())
				.focus()
				.on('change keyup paste', function(e) {
					if (e.keyCode === 46) return;
					try {
						var annotation = chart.annotations().getSelectedAnnotation();
						annotation.enabled();
					} catch (err) {
						annotation = null;
					}
					try {
						if (annotation) {
							$(this).val()
								? annotation.text($(this).val())
								: annotation.text(' ') && $(this).val(' ');
						}
					} catch {
						return;
					}
				});

			chart.listen('annotationDrawingFinish', function(e) {
				if (e.annotation.type === 'label') {
					$annotationLabel.val(e.annotation.text()).focus();
				}
			});

			chart.listen('annotationSelect', function(e) {
				if (e.annotation.type === 'label') {
					$annotationLabel.val(e.annotation.text()).focus();
				}
			});

			chart.listen('annotationUnselect', function() {
				if (e.annotation.type === 'label') {
					$annotationLabel.val('');
				}
			});
		}
	});

	//data loaded event
	chart.listen('dataChanged', function() {
		var ChartStore = localStorage.getItem('annotationsList0');
		chart
			.plot(0)
			.annotations()
			.fromJson(ChartStore);
	});

	if (updateChart) {
		var currentRange = JSON.parse(localStorage.getItem('currentRange'));
		if (currentRange) {
			setTimeout(function() {
				chart.selectRange(currentRange.min, currentRange.max, true);
			}, 10);
		}

		//restore data from existing datatable
		mapping = dataTable.mapAs({
			open: 'Open',
			high: 'High',
			low: 'Low',
			close: 'Close'
		});

		//set mapping to both series
		series.data(mapping);

		var indicatorName;
		var indicatorPlot;
		var indicatorSettings = [];

		plot.yScale('linear');
		for (var keyIndicator in appSettingsCache['indicators']) {
			indicatorName = keyIndicator;

			if (appSettingsCache['indicators'].hasOwnProperty(keyIndicator)) {
				indicatorSettings =
					appSettingsCache['indicators'][keyIndicator]['settings'];
				indicatorSettings[0] = dataTable.mapAs({
					value: 1,
					volume: 1,
					open: 1,
					high: 2,
					low: 3,
					close: 4
				});
			}

			// for slow/fast stochastic
			if (~indicatorName.toLowerCase().indexOf('stochastic')) {
				indicatorName = 'stochastic';
			}

			if (appSettingsCache['indicators'].hasOwnProperty(keyIndicator)) {
				indicatorPlot = chart.plot(
					appSettingsCache['indicators'][keyIndicator]['plotIndex']
				);
				indicatorPlot[indicatorName].apply(indicatorPlot, indicatorSettings);
				// adding extra Y axis to the right side
				indicatorPlot.yAxis(1).orientation('right');
			}
		}

		var arr = [];
		for (var key in appSettingsCache.indicators) {
			arr.push(key);
		}
		$indicatorTypeSelect.val(arr).selectpicker('refresh');

		ChartStore = localStorage.getItem('annotationsList0');
		if (JSON.parse(ChartStore).annotationsList.length)
			chart
				.plot(0)
				.annotations()
				.fromJson(ChartStore);
		for (var key in appSettingsCache['indicators']) {
			var plotIndex = appSettingsCache['indicators'][key].plotIndex;
			ChartStore = localStorage.getItem('annotationsList' + plotIndex);
			if (JSON.parse(ChartStore).annotationsList.length)
				chart
					.plot(plotIndex)
					.annotations()
					.fromJson(ChartStore);
		}
		return;
	}

	dataTable = anychart.data.table('Date');
	// map the data
	mapping = dataTable.mapAs({
		open: 'Open',
		high: 'High',
		low: 'Low',
		close: 'Close',
		value: 'Close'
	});

	// creates an Application to work with socket
	if (!updateChart) {
		localStorage.removeItem('currentRange');
		socket.on('loadData', data => {
			// history data
			if (Array.isArray(data)) {
				historyDataHandler(data);
				if (rangePicker.getElement()) rangePicker.dispose();
				rangePicker.render(chart);
			}

			socket.emit('timerStart');
			timer = 0;
		});
		socket.on('realTimeData', data => {
			oneMinuteDataHandler(data);
		});
	}

	chart.listen('chartDraw', function() {
		setTimeout(function() {
			$loader.hide();
		}, 100);
		//launch timer
		if (secondCounter == null) {
			secondCounter = setInterval(function() {
				timer += 1;
				chart.title(
					'EUR.FOREX data started from Jan 2000 and 1 minute ticker\nThe last update was: ' +
						timer +
						' seconds ago'
				);
			}, 1000);
		}

		var $body = $('body');
		var $textArea = '<textarea id="annotation-label"></textarea>';

		if (!$body.find('#annotation-label').length) {
			$body.find('[data-annotation-type="label"]').length
				? $body.find('[data-annotation-type="label"]').after($textArea)
				: $body.append($textArea);
			$annotationLabel = $('#annotation-label');
		}
	});

	function historyDataHandler(data) {
		// the last item in not a valid data point
		data.pop();
		//add data to OHLCV chart
		dataTable.addData(data);
		//set mapping to the series
		series.data(mapping);

		// create scroller series
		chart.scroller().area(mapping);
	
	}

	function oneMinuteDataHandler(data) {
		/* due to different data format provided
              by vendor for different subscriptions
               // data needs to be formatted to any default view  */
		var oneMinData = {};
		oneMinData['Date'] = data.timestamp * 1000;
		oneMinData['Open'] = data.open;
		oneMinData['High'] = data.high;
		oneMinData['Low'] = data.low;
		oneMinData['Close'] = data.close;
		//add formatted data to OHLCV chart
		dataTable.addData([oneMinData]);
		//set mapping to the series
		series.data(mapping);

		// create scroller series
		chart.scroller().area(mapping);
		timer = 0;
	}
}

function removeChart() {
	if (chart) {
		chart.dispose();
		//nulling mappings
		mapping = null;
	}
}