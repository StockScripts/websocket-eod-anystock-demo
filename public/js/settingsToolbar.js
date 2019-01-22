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
	'<input type="number" class="form-control form-control-sm" id="">' +
	'</div>' +
	'</div>';

var selectHtml =
	'<div class="col-sm-4">' +
	'<div class="form-group" id="indicatorFormGroup">' +
	'<label for="" class="control-label"></label>' +
	'<select class="form-control form-control-sm select show-tick" data-style="btn-sm" id=""></select>' +
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