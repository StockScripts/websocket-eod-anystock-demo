/* global $, chart, app, mapping, dataTable, setColClass, drawIndicators */
/* exported theme, indicatorList */
"use strict";

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
appSettingsCache.data = {};
appSettingsCache.chartType = $seriesTypeSelect.val();
appSettingsCache.indicators = {};

// chart container id
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


// get default theme after launch
var theme = $themeSelect.val();

// html markup for the indicator settings input
var inputHtml =
	'<div class="col-sm-4">' +
	'<div class="form-group" id="indicatorFormGroup">' +
	'<label for="" class="control-label"></label>' +
	'<input type="number" class="form-control form-control-sm" id="">' +
	'</div>' +
	'</div>';

// html markup for the indicator settings input
var selectHtml =
	'<div class="col-sm-4">' +
	'<div class="form-group" id="indicatorFormGroup">' +
	'<label for="" class="control-label"></label>' +
	'<select class="form-control form-control-sm select show-tick" data-style="btn-light btn-sm" id=""></select>' +
	'</div>' +
	'</div>';

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

// event to set theme
$themeSelect.on('change', function() {
	theme = $(this).val();

	$('.btn[data-action-type = "saveAnno"]').addClass('disabled');

	var currentRange = {
		min: chart.xScale().getMinimum(),
		max: chart.xScale().getMaximum()
	};
	let json = JSON.stringify(currentRange);
	localStorage.setItem('currentRange', json);

	chart
		.plot()
		.annotations()
		.removeAllAnnotations();

	app.removeChart();
	// reset saved settings
	appSettingsCache['chartType'] = 'candlestick';
	// select series type
	$seriesTypeSelect.val('candlestick').selectpicker('refresh');
	// reset indicators select
	$indicatorTypeSelect.val('').selectpicker('refresh');
	// init, create chart
	app.createChart(chartContainer, true);

	
	// create scroller series
	chart.scroller().area(mapping);
	drawIndicators(appSettingsCache.indicators);
});

// event to show modal indicator settings
$indicatorTypeSelect.on('change', function() {
	//saving annotations from all plots
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
		$('.btn[data-action-type = "saveAnno"]').addClass('disabled');

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
function indicatorDismissHandler(e) {
	if ($(e.currentTarget).data('dismiss') || e.type === 'hide') {
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

		var indexOption = $indicatorTypeSelect.val().indexOf(lastAddedIndicator);

		var selectValues = $indicatorTypeSelect.val();
		selectValues.splice(indexOption, 1);

		$indicatorTypeSelect.val(selectValues);
		$indicatorTypeSelect.selectpicker('render');
	}
}

$indicatorSettingsModal.find('button').on('click', indicatorDismissHandler);

// init selectpicker to all select in indicator settings modal
$indicatorSettingsModal.on('show.bs.modal', function() {
	$indicatorForm.find('.select').selectpicker();
});

// reset all settings
$resetBtn.on('click', function(e) {
	e.preventDefault();

	//set default theme
	$themeSelect.selectpicker('val', 'darkEarth');
	theme = 'darkEarth';

	app.removeChart();
	// reset saved settings
	appSettingsCache.indicators = {};
	appSettingsCache.chartType = 'candlestick';
	
	const annotations = JSON.parse(localStorage.getItem('annotations'));
	annotations.length = 1;
	localStorage.setItem('annotations', JSON.stringify(annotations));
	localStorage.setItem('indicators', JSON.stringify(appSettingsCache.indicators));

	// select series type
	$seriesTypeSelect.val('candlestick').selectpicker('refresh');
	// reset indicators select
	$indicatorTypeSelect.val('').selectpicker('refresh');
	// init, create chart
	app.createChart(chartContainer, true);
});

// event to add indicator
$addIndicatorBtn.on('click', function() {
	var mapping = dataTable.mapAs({
		open: 'Open',
		high: 'High',
		low: 'Low',
		close: 'Close',
		value: 'Close',
		volume: 'Close'
	});
	var indicator = indicatorsSettings.defaultSettings[indicatorsSettings.name];
	var settings = [mapping];
	var indicatorName = indicatorsSettings.name;

	// for slow/fast stochastic
	if (~indicatorName.toLowerCase().indexOf('stochastic')) {
		indicatorName = 'stochastic';
	}

	for (let key in indicator) {
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
	$('.btn[data-action-type = "saveAll"]').removeClass('disabled');
});

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
			.append('<div class="col-sm-12" id="overviewText"></div>');
	} else {
		$indicatorForm
			.find($("[class*='col-sm-']"))
			.last()
			.after('<div class="col-sm-12" id="overviewText"></div>');
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