function setColClass($el) {
	// column count for row
	var ROW_COUNT = 12;
	var COLUMN_COUNT = 3;
	var index = $el.find('.col-sm-4').length;
	var lastIndex = $el
		.find('.col-sm-4')
		.last()
		.index();
	var colClass;

	if (index === COLUMN_COUNT) {
		return;
	}

	if (index > COLUMN_COUNT) {
		while (index > COLUMN_COUNT) {
			index -= COLUMN_COUNT;
		}
	}

	colClass = ROW_COUNT / index;

	while (index) {
		--index;
		$el
			.find($("[class*='col-sm-']"))
			.eq(lastIndex - index)
			.removeClass('col-sm-4')
			.addClass('col-sm-' + colClass);
	}
}

function getInputLabelText(keyText) {
	var text = '';
	var result = [];

	keyText.split(/(?=[A-Z])/).filter(function(item) {
		if (item.length === 1) {
			text += item;
		} else {
			text += ' ';
			text += item;
		}
	});
	text = text.trim();
	text = text[0].toUpperCase() + text.substr(1);

	text.split(' ').filter(function(item, index) {
		if (item.length === 1 && index !== text.split(' ').length - 1) {
			result.push(item + '-');
		} else {
			result.push(item);
		}
	});

	return result.join(' ').replace(/-\s/, '-');
}

initTooltip('bottom');

var toolsButton = $('#tools').html();

var $strokeSettings = $('.strokeSettings');
var $annotationLabel;
var $fontSize = $('#select-font-size');
var $fontSettings = $('#select-font-style');
var $labelMethod = $('[data-label-method]');

var annotationsColor;

$strokeSettings
	.filter('.size')
	.on('changed.bs.select', function(e, i, sel, prev) {
		$strokeSettings
			.filter('.dash')
			.find('option')
			.each(function(index, item) {
				$(item).data(
					'icon',
					$(item)
						.data('icon')
						.replace(prev, e.target.value)
				);
			});
		$strokeSettings.filter('.dash').selectpicker('refresh');
	});

// page UI elements
createPageColorPicker();

var $seriesTypeSelect = $('#seriesTypeSelect');
var $indicatorTypeSelect = $('#indicatorTypeSelect');
var $indicatorSettingsModal = $('#indicatorSettingsModal');
var $resetBtn = $('#resetButton');
var $addIndicatorBtn = $('#addIndicatorButton');
var $indicatorNavPanel = $('#indicatorNavPanel');
var $indicatorForm = $('#indicatorForm');
var $loader = $('#loader');
var $themeSelect = $('#themeSelect');

var appSettingsCache = {};
appSettingsCache['data'] = {};
appSettingsCache['chartType'] = $seriesTypeSelect.val();
appSettingsCache['indicators'] = {};

var chartContainer = 'chart-container';

var indicatorsSettings = {
	name: '',
	plotIndex: 0,
	defaultSettings: {},
	seriesType: [
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
//
var chart;
var dataTable;
var mapping;
var indicatorlist = [];
//default theme after launch
var theme = $themeSelect.val();
//seconds counter
var timer = 0;
var secondCounter = null;

var inputHtml =
	'<div class="col-sm-4">' +
	'<div class="form-group" id="indicatorFormGroup">' +
	'<label for="" class="control-label"></label>' +
	'<input type="number" class="form-control" id="">' +
	'</div>' +
	'</div>';

var selectHtml =
	'<div class="col-sm-4">' +
	'<div class="form-group" id="indicatorFormGroup">' +
	'<label for="" class="control-label"></label>' +
	'<select class="form-control select show-tick" id=""></select>' +
	'</div>' +
	'</div>';

var app = {
	createChart: createChart,
	removeChart: removeChart
};

// this Sample will properly work only if upload it to a server and access via http or https
if (window.location.protocol === 'file:') {
	$loader.hide();
	$('.wrapper').hide();
	$('#warning').modal({
		backdrop: 'static',
		keyboard: false
	});
}

// get indicators from file indicators.xml
fetch('indicators.xml')
	.then(function(res) {
		return res.text();
	})
	.then(function(str) {
		return new window.DOMParser().parseFromString(str, 'text/xml');
	})
	.then(function(data) {
		$(data)
			.find('indicator')
			.each(function(index, item) {
				var indicatorName = $(this).attr('type');
				var description;
				var $option = $('<option></option>');

				// create option and append to indicator type select
				$option
					.attr({
						value: indicatorName,
						title: $(this)
							.find('abbreviation')
							.text(),
						'data-abbr': $(this)
							.find('abbreviation')
							.text(),
						'data-full-text': $(this)
							.find('title')
							.text(),
						'data-plot': $(this)
							.find('plotIndex')
							.text()
					})
					.text(
						$(this)
							.find('title')
							.text()
					);

				if ($(this).find('[name="plotIndex"]').length) {
					$option.attr(
						'data-plot-index',
						$(this)
							.find('[name="plotIndex"]')
							.attr('value')
					);
				}

				$indicatorTypeSelect.append($option);

				indicatorsSettings['defaultSettings'][indicatorName] = {};

				// set indicator settings to indicator object
				$(item)
					.find('defaults')
					.children()
					.each(function() {
						var prop = $(this).attr('name');
						var value = $(this).attr('value');

						switch ($(this).attr('type')) {
							case 'number':
								value = +value;
								break;
							case 'array':
								value = JSON.parse(value);
								break;
						}

						indicatorsSettings['defaultSettings'][indicatorName][prop] = value;
					});

				// description from xml
				description = $(item)
					.find('description')
					.text();

				// save indicator overview
				indicatorsSettings['defaultSettings'][indicatorName]['overview'] = {};
				indicatorsSettings['defaultSettings'][indicatorName]['overview'][
					'title'
				] = $(item)
					.find('title')
					.text();
				indicatorsSettings['defaultSettings'][indicatorName]['overview'][
					'description'
				] = description;
			});

		// sort option in select
		var options = $indicatorTypeSelect.find('option').sort(function(a, b) {
			return a.text.toUpperCase().localeCompare(b.text.toUpperCase());
		});
		$indicatorTypeSelect.append(options);

		// init selectpicker
		$indicatorTypeSelect.selectpicker();
	});

$(window).on('resize', initHeightChart);

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

	// event to set theme
	$themeSelect.on('change', function() {
		theme = $(this).val();

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

		$('.btn[data-action-type]')['3'].className = 'btn btn-default disabled';

		var currentRange = {};
		currentRange.min = chart.xScale().getMinimum();
		currentRange.max = chart.xScale().getMaximum();
		json = JSON.stringify(currentRange);
		localStorage.setItem('currentRange', json);

		chart
			.plot()
			.annotations()
			.removeAllAnnotations();

		app.removeChart();
		// reset saved settings
		appSettingsCache['chartType'] = 'line';
		// select series type
		$seriesTypeSelect.val('candlestick').selectpicker('refresh');
		// reset indicators select
		$indicatorTypeSelect.val('').selectpicker('refresh');
		// init, create chart
		app.createChart(chartContainer, true);
	});

	// event to show modal indicator settings
	$indicatorTypeSelect.on('change', function() {
		//saving annotations from all plots

		// console.log(appSettingsCache['indicators']);
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

		if (
			$(this).val() === null ||
			$(this).val().length < Object.keys(appSettingsCache.indicators).length
		) {
			$('.btn[data-action-type]')['3'].className = 'btn btn-default disabled';

			var currentRange = {};
			currentRange.min = chart.xScale().getMinimum();
			currentRange.max = chart.xScale().getMaximum();
			json = JSON.stringify(currentRange);
			localStorage.setItem('currentRange', json);

			app.removeChart();

			if ($(this).val() !== null) {
				for (var keyIndicator in appSettingsCache.indicators) {
					if (
						!~$(this)
							.val()
							.indexOf(keyIndicator)
					) {
						delete appSettingsCache.indicators[keyIndicator];
					}
				}
			} else {
				appSettingsCache.indicators = {};
			}

			app.createChart(chartContainer, true);

			return;
		}

		for (var i = 0; i < $(this).val().length; i++) {
			if (
				!~Object.keys(appSettingsCache.indicators).indexOf($(this).val()[i])
			) {
				// set indicator name
				indicatorsSettings.name = $(this).val()[i];
				break;
			}
		}

		// set plot index
		indicatorsSettings.plotIndex = $(this)
			.find('option[value="' + indicatorsSettings.name + '"]')
			.data().plotIndex;

		// create html if form (input/select)
		createHtmlToIndicatorForm();
		// set default indicator settings to input/select
		setDefaultIndicatorSettings();

		// show indicator settings modal
		$indicatorSettingsModal.modal('show');
		// hide dropdown menu, select
		$indicatorNavPanel.find('.select.open').removeClass('open');
	});

	// remove selected class, if indicator not selected
	$indicatorSettingsModal.on('hidden.bs.modal', function() {
		var lastAddedIndicator;

		for (var i = 0; i < $indicatorTypeSelect.val().length; i++) {
			if (
				!~Object.keys(appSettingsCache.indicators).indexOf(
					$indicatorTypeSelect.val()[i]
				)
			) {
				// set indicator name
				lastAddedIndicator = $indicatorTypeSelect.val()[i];
				break;
			}
		}

		var indexOption = $indicatorTypeSelect
			.find('[value="' + lastAddedIndicator + '"]')
			.index();

		// unselect option
		$indicatorTypeSelect
			.find('[value="' + lastAddedIndicator + '"]')
			.removeAttr('selected');
		// remove selected class
		$indicatorTypeSelect
			.prev('.dropdown-menu')
			.find('li[data-original-index="' + indexOption + '"]')
			.removeClass('selected');
	});

	// init selectpicker to all select in indicator settings modal
	$indicatorSettingsModal.on('show.bs.modal', function() {
		$indicatorForm.find('.select').selectpicker();
	});

	// reset all settings
	$resetBtn.on('click', function(e) {
		e.preventDefault();

		//set default theme
		$themeSelect.selectpicker('val', 'darkTurquoise');
		theme = 'darkTurquoise';

		app.removeChart();
		// reset saved settings
		appSettingsCache['indicators'] = {};
		appSettingsCache['chartType'] = 'line';

		// select series type
		$seriesTypeSelect.val('candlestick').selectpicker('refresh');
		// reset indicators select
		$indicatorTypeSelect.val('').selectpicker('refresh');
		// init, create chart
		app.createChart(chartContainer, true);
		//dismiss existing indicators
		indicatorlist = [];
	});

	// event to add indicator
	$addIndicatorBtn.on('click', function() {
		var mapping = dataTable.mapAs({
			value: 1,
			volume: 1,
			open: 1,
			high: 2,
			low: 3,
			close: 4
		});
		var indicator = indicatorsSettings.defaultSettings[indicatorsSettings.name];
		var settings = [mapping];
		var indicatorName = indicatorsSettings.name;

		// for slow/fast stochastic
		if (~indicatorName.toLowerCase().indexOf('stochastic')) {
			indicatorName = 'stochastic';
		}

		for (key in indicator) {
			if (key !== 'overview' && key !== 'plotIndex') {
				var val = $('#' + key).val();
				val = val === 'true' || val === 'false' ? val === 'true' : val;
				settings.push(val);
			}
		}

		// save settings for indicator
		appSettingsCache['indicators'][indicatorsSettings.name] = {};
		appSettingsCache['indicators'][indicatorsSettings.name][
			'settings'
		] = settings;
		appSettingsCache['indicators'][indicatorsSettings.name]['plotIndex'] =
			indicatorsSettings.plotIndex;

		var plot = chart.plot(indicatorsSettings.plotIndex);
		plot[indicatorName].apply(plot, settings);
		// adding extra Y axis to the right side
		plot.yAxis(1).orientation('right');
		// hide indicator settings modal
		$indicatorSettingsModal.modal('hide');

		//save indicator
		indicatorlist.push(appSettingsCache['indicators'][indicatorsSettings.name]);
	});

	$('select.choose-drawing-tools').on('change', changeAnnotations);
	$('select.choose-marker').on('change', changeAnnotations);
	$('#newLabel').click(changeAnnotations);

	$('#annotation-label-autosize').on('click', function() {
		var annotation = chart.annotations().getSelectedAnnotation();

		if (annotation && annotation.type === 'label') {
			annotation.width(null);
			annotation.height(null);
		}

		setToolbarButtonActive(null);

		$annotationLabel.focus();
	});

	function changeAnnotations() {
		var $that = $(this);

		setTimeout(function() {
			var $target = $that;
			var active = $target.hasClass('active');
			var $markerSize = $('#select-marker-size');
			var markerSize = $markerSize.val();
			// var fontSize = $fontSize.attr('data-volume');
			var $fontSize = $('#select-font-size');
			var fontSize = $fontSize.val();
			var fontColor = $('[data-color="fontColor"]')
				.find('.color-fill-icon')
				.css('background-color');

			var colorFill = $('#fill .color-fill-icon').css('background-color');
			var colorStroke = $('#stroke .color-fill-icon').css('background-color');

			var strokeType;
			var strokeWidth;
			var strokeDash;
			var STROKE_WIDTH = 1;
			var annotation = chart.annotations().getSelectedAnnotation();

			strokeWidth = $strokeSettings.filter('.size').val() || STROKE_WIDTH;

			switch ($strokeSettings.filter('.dash').val()) {
				case 'solid':
					strokeDash = null;
					break;
				case 'dotted':
					strokeDash = '1 1';
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
					setToolbarButtonActive(null);
				}
			}

			var type = $target.data().annotationType;

			if (type === 'marker') {
				var markerType = $target.val();
			}

			setToolbarButtonActive(type, markerType);

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
				setToolbarButtonActive(null);
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

				$('.btn[data-action-type]')['3'].className = 'btn btn-default disabled';
				break;
		}
	});

	$('select.strokeSettings').on('change', function() {
		var strokeWidth;
		var strokeType;
		var STROKE_WIDTH = 1;

		strokeWidth = $strokeSettings.filter('.size').val() || STROKE_WIDTH;
		strokeType = $strokeSettings.filter('.dash').val();
		updatePropertiesBySelectedAnnotation(strokeWidth, strokeType);
	});

	$('#select-marker-size').on('change', function() {
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

function selectTools(toolbarType) {
	$('.tools[id]').hide();
	$('#' + toolbarType).show();
}

function initHeightChart() {
	var creditsHeight = 10;
	var panelHeight = $('#settingsPanel').outerHeight();
	$('#chart-container').height(
		$(window).height() -
			$indicatorNavPanel.outerHeight() -
			creditsHeight -
			panelHeight - 40
	);
}

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
	var series = plot.candlestick();

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
		$('.drawing-tools-solo')
			.find('.bootstrap-select')
			.each(function() {
				$(this).removeClass('open');
			});
	});
	chart.listen('annotationChangeFinish', function() {
		$('.btn[data-action-type]')['3'].className = 'btn btn-default';
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
		close: 'Close'
	});

	// creates an Application to work with socket
	//start COMET connection
	if (!updateChart) {
		localStorage.removeItem('currentRange');
		(function() {
			//open connection
			fetch('http://localhost:8081/eod');

			start();

			function start() {
				if (!window.EventSource) {
					alert("This browser doesn't support EventSource.");
					return;
				}

				var eventSource = new EventSource('eod');

				eventSource.onopen = function() {
					log('Connection established');
				};

				eventSource.onerror = function(e) {
					if (this.readyState == EventSource.CONNECTING) {
						log('Connection lost, retrying...');
					} else {
						log('Error, state: ' + this.readyState);
					}
				};

				eventSource.addEventListener(
					'bye',
					function(e) {
						log('Bye: ' + e.data);
					},
					false
				);

				eventSource.onmessage = function(e) {
					timer = 0;
					var data = JSON.parse(e.data);

					// history data
					if (Array.isArray(data)) {
						historyDataHandler(data);
						rangePicker.render(chart);
					}

					//  1 minute changes subscription
					if (data.code === 'EUR.FOREX') {
						oneMinuteDataHandler(data);
					}
				};
			}

			function log(msg) {
				console.log(msg + '\n');
			}
		})();
	}

	chart.listen('chartDraw', function() {
		initHeightChart();
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
	}
}

function removeChart() {
	if (chart) {
		chart.dispose();
		//nulling mappings
		mapping = null;
	}
}

function createPageColorPicker() {
	var colorPicker = $('.colorpickerplus-dropdown .colorpickerplus-container');
	var colorPickerBtn = $('.color-picker');
	var strokeWidth;
	var STROKE_WIDTH = 1;
	colorPicker.colorpickerembed();
	colorPickerBtn.tooltip();
	$strokeSettings.selectpicker();
	// $('.colorpickerplus-dropdown.stroke .dropdown-menu .bootstrap-select').on('click', function(event) {
	//   event.stopPropagation();
	// });
	colorPicker.on('changeColor', function(e, color) {
		// $('.colorpickerplus-dropdown.stroke').dropdown('toggle');
		var annotation = chart.annotations().getSelectedAnnotation();
		var _annotation = annotation;

		if (annotation) {
			if (annotation.type === 'label') {
				$annotationLabel.focus();
				annotation = annotation.background();
			}

			switch (
				$(this)
					.parents('.dropdown')
					.find('[data-color]')
					.data('color')
			) {
				case 'fill':
					annotation.fill(color, 0.3);
					break;
				case 'stroke':
					strokeWidth = annotation.stroke().thickness || STROKE_WIDTH;
					strokeDash = annotation.stroke().dash || '';
					var settings = {
						thickness: strokeWidth,
						color: color,
						dash: strokeDash
					};
					setAnnotationStrokeSettings(annotation, settings);
					break;
				case 'fontColor':
					if (_annotation.type === 'label') _annotation.fontColor(color);
					break;
			}
		}

		if (color === null) {
			$(
				'#' +
					$(this)
						.parents('.dropdown')
						.find('[data-color]')
						.data('color') +
					' .color-fill-icon'
			).addClass('colorpicker-color');
		} else {
			$(
				'#' +
					$(this)
						.parents('.dropdown')
						.find('[data-color]')
						.data('color') +
					' .color-fill-icon'
			).removeClass('colorpicker-color');
			$(
				'#' +
					$(this)
						.parents('.dropdown')
						.find('[data-color]')
						.data('color') +
					' .color-fill-icon'
			).css('background-color', color);
		}
	});
}

$('#select-marker-type').on('loaded.bs.select', function(event) {
	$('.choose-marker .dropdown-menu li').each(function(index, item) {
		$(item).data('placement', 'right');
		$(item)
			.attr('title', $(event.target.options[index + 1]).data('title'))
			.tooltip();
	});
});

function removeSelectedAnnotation() {
	var annotation = chart.annotations().getSelectedAnnotation();
	if (annotation) chart.annotations().removeAnnotation(annotation);
	return !!annotation;
}

function removeAllAnnotation() {
	chart.annotations().removeAllAnnotations();
	localStorage.removeItem('annotationsList');
}

function onAnnotationDrawingFinish() {
	setToolbarButtonActive(null);
	$('.btn[data-action-type]')['3'].className = 'btn btn-default';
}

function onAnnotationSelect(evt) {
	var annotation = evt.annotation;
	var colorFill;
	var colorStroke;
	var strokeWidth;
	var strokeDash;
	var strokeType;
	var markerSize;
	var fontColor;
	var fontSize;
	var STROKE_WIDTH = 1;
	var STROKE_DASH = 'solid';
	var $strokeSettings = $('.strokeSettings');
	var $markerSize = $('#select-marker-size');
	var $markerSizeBtn = $('.select-marker-size');
	var $colorPickerFill = $('[data-color="fill"]');
	var $colorPickerStroke = $('[data-color="stroke"]');
	var $colorPickerFontColor = $('.color-picker[data-color="fontColor"]');

	var fontSettings = [];

	var toolbarType =
		annotation.type !== 'label' && annotation.type !== 'marker'
			? 'drawing'
			: annotation.type;
	selectTools(toolbarType);
	$('.toolbar a[href="#annotation-panel"]').tab('show');

	if (annotation.type === 'label') {
		$annotationLabel.focus();

		fontSize = annotation.fontSize();

		$fontSize.val(fontSize).selectpicker('refresh');

		fontColor = annotation.fontColor();

		fontSettings = [];

		$labelMethod.each(function() {
			var method = $(this).data().labelMethod;

			fontSettings.push(annotation[method]());
		});

		// update font settings select
		$fontSettings.val(fontSettings).selectpicker('refresh');

		annotation = annotation.background();
	}
	if (annotation.fill !== undefined) {
		$colorPickerFill.removeAttr('disabled');
		colorFill = annotation.fill();
	} else {
		$colorPickerFill.attr('disabled', 'disabled');
	}

	if (typeof annotation.stroke() === 'function') {
		colorStroke = $colorPickerStroke
			.find('.color-fill-icon')
			.css('background-color');
		colorFill = $colorPickerFill
			.find('.color-fill-icon')
			.css('background-color');

		if (colorFill.indexOf('a') === -1) {
			colorFill = colorFill.replace('rgb', 'rgba').replace(')', ', 0.3)');
		}
		strokeWidth = $strokeSettings.filter('.size').val() || STROKE_WIDTH;

		switch ($strokeSettings.filter('.dash').val()) {
			case 'solid':
				strokeDash = null;
				break;
			case 'dotted':
				strokeDash = '1 1';
				break;
			case 'dashed':
				strokeDash = '10 5';
				break;
			default:
				strokeDash = null;
		}
	} else {
		colorStroke = annotation.stroke().color;
		strokeWidth = annotation.stroke().thickness;
		strokeDash = annotation.stroke().dash;
	}

	if (strokeType === undefined) {
		strokeType = strokeDash;
	}

	if (annotation.type === 'marker') {
		markerSize = annotation.size();

		if ($('.choose-marker').hasClass('open')) {
			$markerSize.val($markerSize.val()).selectpicker('refresh');
			annotation.size($markerSize.val());
			$markerSizeBtn.removeAttr('disabled');
		} else {
			$markerSize
				.removeAttr('disabled')
				.val(markerSize)
				.selectpicker('refresh');
			annotation.size(markerSize);
			$markerSizeBtn.removeAttr('disabled');
		}
		$markerSizeBtn.removeAttr('disabled');
	} else {
		$markerSizeBtn.attr('disabled', 'disabled');
	}

	var settings = {
		thickness: strokeWidth,
		color: colorStroke,
		dash: strokeType
	};

	// setAnnotationStrokeSettings(annotation, settings);

	if (annotation.fill !== undefined) {
		annotation.fill(colorFill);
	}

	switch (strokeType) {
		case `${strokeWidth} ${strokeWidth}`:
			strokeDash = 'dotted';
			break;
		case '10 5':
			strokeDash = 'dashed';
			break;
		default:
			strokeDash = 'solid';
			break;
	}

	$colorPickerFill
		.find('.color-fill-icon')
		.css('background-color', colorFill.color);
	$colorPickerStroke
		.find('.color-fill-icon')
		.css('background-color', colorStroke);
	$colorPickerFontColor
		.find('.color-fill-icon')
		.css('background-color', fontColor);
	$strokeSettings.val([strokeWidth, strokeDash]).selectpicker('refresh');
}

function contextMenuItemsFormatter(items) {
	// insert context menu item on 0 position
	items['annotations-remove-selected'] = {
		text: 'Remove selected annotation',
		action: removeSelectedAnnotation,
		index: -10
	};

	// insert context menu item on 1 position
	items['annotations-remove-all'] = {
		text: 'Remove all annotations',
		action: removeAllAnnotation,
		index: -5
	};

	// insert context menu separator
	items['annotations-separator'] = {
		index: -4
	};

	return items;
}

function setToolbarButtonActive(type, markerType) {
	var $buttons = $('.btn[data-annotation-type]');
	$buttons.removeClass('active');
	$buttons.blur();

	if (type) {
		var selector = '.btn[data-annotation-type="' + type + '"]';
		if (markerType) selector += '[data-marker-type="' + markerType + '"]';
		$(selector).addClass('active');
		$('#tools').html($(selector).html());
	} else {
		$('#tools').html(toolsButton);
	}
}

function updatePropertiesBySelectedAnnotation(strokeWidth, strokeType) {
	var strokeColor;
	var annotation = chart.annotations().getSelectedAnnotation();
	if (annotation === null) return;

	if (annotation.type === 'label') {
		strokeColor = annotation.background().stroke().color;
	} else {
		strokeColor = annotation.stroke().color;
	}

	switch (strokeType) {
		case 'solid':
			strokeType = null;
			break;
		case 'dotted':
			strokeType = `${strokeWidth} ${strokeWidth}`;
			break;
		case 'dashed':
			strokeType = '10 5';
			break;
	}

	var settings = {
		thickness: strokeWidth,
		color: strokeColor,
		dash: strokeType
	};

	if (annotation.type === 'label') {
		$annotationLabel.focus();
		// annotation = annotation.background();
		annotation.background().stroke(settings);
		annotation
			.hovered()
			.background()
			.stroke(settings);
		annotation
			.selected()
			.background()
			.stroke(settings);
		return;
	}

	setAnnotationStrokeSettings(annotation, settings);
}

function setAnnotationStrokeSettings(annotation, settings) {
	annotation.stroke(settings);
	if (annotation.hovered || annotation.selected) {
		annotation.hovered().stroke(settings);
		annotation.selected().stroke(settings);
	}
}

function initTooltip(position) {
	$(document).ready(function() {
		$('[data-toggle="tooltip"]').tooltip({
			placement: position,
			animation: false
		});
	});
}

function normalizeFontSettings(val) {
	var fontMethods = {};

	$labelMethod.each(function() {
		fontMethods[$(this).data().labelMethod] = null;
	});

	val &&
		val.forEach(function(item) {
			if (item) {
				$fontSettings.find('[data-label-method]').each(function() {
					var $that = $(this);
					var $el = $(this).find('option').length
						? $(this).find('option')
						: $(this);

					$el.each(function() {
						if ($(this).val() === item) {
							fontMethods[$that.attr('data-label-method')] = item;
						}
					});
				});
			}
		});

	return fontMethods;
}

function createHtmlToIndicatorForm() {
	var $indicatorFormGroup;
	var indicatorSettings =
		indicatorsSettings.defaultSettings[indicatorsSettings.name];
	var $option;
	var i = 0;

	$('#indicatorSettingsModalTitle').text(
		indicatorsSettings.defaultSettings[indicatorsSettings.name].overview.title
	);

	// empty form
	$indicatorForm.empty();
	// create row
	$indicatorForm.append('<div class="row"></div>');
	var $indicatorFormRow = $indicatorForm.find('.row');

	for (var key in indicatorSettings) {
		if (
			indicatorSettings.hasOwnProperty(key) &&
			key !== 'overview' &&
			key !== 'plotIndex'
		) {
			if (typeof indicatorSettings[key] === 'string') {
				$indicatorFormRow.append(selectHtml);
				$indicatorFormGroup = $('#indicatorFormGroup');
				$indicatorFormGroup.find('select').attr('id', key);
				$indicatorFormGroup
					.find('label')
					.attr('for', key)
					.text(getInputLabelText(key));

				for (i = 0; i < indicatorsSettings.seriesType.length; i++) {
					$option = $('<option></option>');
					$option.val(indicatorsSettings.seriesType[i].toLowerCase());
					$option.text(getInputLabelText(indicatorsSettings.seriesType[i]));
					$indicatorFormGroup.find('select').append($option);
				}

				$indicatorFormGroup.removeAttr('id');
			} else if (typeof indicatorSettings[key] === 'number') {
				$indicatorFormRow.append(inputHtml);
				$indicatorFormGroup = $('#indicatorFormGroup');
				$indicatorFormGroup.find('input').attr('id', key);

				$indicatorFormGroup
					.removeAttr('id')
					.find('label')
					.attr('for', key)
					.text(getInputLabelText(key));
			} else if (typeof indicatorSettings[key] === 'object') {
				$indicatorFormRow.append(selectHtml);
				$indicatorFormGroup = $('#indicatorFormGroup');
				$indicatorFormGroup.find('select').attr('id', key);
				$indicatorFormGroup
					.find('label')
					.attr('for', key)
					.text(getInputLabelText(key));

				for (i = 0; i < indicatorSettings[key].length; i++) {
					$option = $('<option></option>');
					$option.val(indicatorSettings[key][i].toLowerCase());
					$option.text(indicatorSettings[key][i]);
					$indicatorFormGroup.find('select').append($option);
				}

				$indicatorFormGroup.removeAttr('id');
			}
		}
	}

	// col class to form el
	setColClass($indicatorForm);
	// indicator overview text
	if ($indicatorForm.find($("[class*='col-sm-']")).length == 0) {
		$indicatorForm
			.find($('[class="row"]'))
			.append('<div class="col-xs-12" id="overviewText"></div>');
	} else {
		$indicatorForm
			.find($("[class*='col-sm-']"))
			.last()
			.after('<div class="col-xs-12" id="overviewText"></div>');
	}
	$indicatorForm
		.find('#overviewText')
		.append(
			indicatorsSettings.defaultSettings[indicatorsSettings.name].overview
				.description
		);
}

function setDefaultIndicatorSettings() {
	var indicatorSettings =
		indicatorsSettings.defaultSettings[indicatorsSettings.name];

	for (var key in indicatorSettings) {
		if (
			indicatorSettings.hasOwnProperty(key) &&
			key !== 'overview' &&
			key !== 'plotIndex'
		) {
			$('#' + key).val(indicatorSettings[key]);
		}
	}
}

$('.tools-dropdown').on('hide.bs.dropdown', function() {
	// do something…
});
