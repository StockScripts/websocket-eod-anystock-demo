/* global $, chart, app, mapping */
/* exported theme, indicatorList */
"use strict";

const $loader = $('#loader');
const $seriesTypeSelect = $('#seriesTypeSelect');
const $indicatorTypeSelect = $('#indicatorTypeSelect');
const $themeSelect = $('#themeSelect');
const $resetBtn = $('.resetButton');

app.state.settings.chartType = $seriesTypeSelect.val();

// chart container id
const chartContainer = 'chart-container';

const seriesTypes = [
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
];

// this Sample will properly work only if upload it to a server and access via http or https
if (window.location.protocol === 'file:') {
	$loader.hide();
	$('.wrapper').hide();
	$('#warning').modal({
		backdrop: 'static',
		keyboard: false
	});
}

// chart type select listener
$seriesTypeSelect.on('change', function () {
	const type = $(this).val();

	// set chart type
	chart
		.plot()
		.getSeries(0)
		.seriesType(type);
	// save chart type
	app.state.settings.chartType = type;
	$('.btn[data-action-type="saveAppState"]').removeClass('disabled');
});

// theme select listener
$themeSelect.on('change', function () {
	$loader.show();
	app.state.settings.theme = $(this).val();

	app.state.settings.currentRange = [
		chart.xScale().getMinimum(),
		chart.xScale().getMaximum()
	];

	app.removeChart();

	// init, create chart
	app.createChart(chartContainer, true);

	$('.btn[data-action-type="saveAppState"]').removeClass('disabled');
});


// get indicators from file indicators.xml
fetch('indicators.json')
	.then(res => res.json())
	.then(indicators => {
		const sorted = {};
		Object.keys(indicators).sort().forEach(function(key) {
			sorted[key] = indicators[key];
		});
		for (let type in sorted) {
			const option = document.createElement('option');
			option.value = type;
			option.title = option.dataset.abbr = indicators[type].abbreviation;
			option.dataset.fullText = option.innerText = indicators[type].title;
			if (indicators[type].onChartPlot) option.dataset.onChartPlot = indicators[type].onChartPlot;
			$indicatorTypeSelect.append(option);
		}

		// event to show modal indicator settings
		$indicatorTypeSelect.on('changed.bs.select', function (e, selectedIndex) {
			if (
				$(this).val() === null ||
				$(this).val().length < Object.keys(app.state.indicators).length
			) {
				app.state.settings.currentRange = [
					chart.xScale().getMinimum(),
					chart.xScale().getMaximum()
				];

				let removedKey = Object.keys(app.state.indicators).filter(x => !$(this).val().includes(x));

				const plotIndex = app.state.indicators[removedKey].plotIndex;

				delete app.state.indicators[removedKey];

				if (plotIndex > 0) {
					delete app.state.annotations['annotationsList' + plotIndex];
				}

				app.removeChart();

				app.createChart(chartContainer, true);

				return;
			}

			const type = Object.keys(sorted)[selectedIndex];

			const indicator = Object.assign(sorted[type], {
				type
			});

			// create html if form (input/select)
			const $indicatorModal = $(renderIndicatorDialog(indicator));

			const $indicatorForm = $indicatorModal.find('#indicatorForm');

			$indicatorForm.on('submit', e => {
				e.preventDefault();
				const settings = [];
				const formdata = new FormData(e.target);
				for (let [, value] of formdata.entries()) {
					settings.push(value);
				}
				let plotIndex = indicator.onChartPlot ? 0 : chart.getPlotsCount();
				if (chart.plot(plotIndex).getSeriesCount() && plotIndex) {
					plotIndex++;
				}

				const plot = chart.plot(plotIndex);
				// for slow/fast stochastic
				if (indicator.type.toLowerCase().includes('stochastic')) {
					plot['stochastic'].apply(plot, settings);
				} else {
					plot[type].apply(plot, [mapping, ...settings]);
				}
				// adding extra Y axis to the right side
				plot.yAxis(1).orientation('right');

				app.state.indicators[type] = {
					settings,
					plotIndex
				}

				$indicatorModal.modal('hide');
			});

			// init selectpicker to all select in indicator settings modal
			$indicatorModal.on('show.bs.modal', function () {
				setColClass($indicatorForm);
				$(this).find('.select').selectpicker();
			});

			$indicatorModal.on('hidden.bs.modal', function () {
				$indicatorModal.remove();
			});

			// show indicator settings modal
			$indicatorModal.modal('show');

			$indicatorModal.find('button').on('click', indicatorDismissHandler);
		});
	});

// remove selected class, if indicator not selected
function indicatorDismissHandler(e) {
	if ($(e.currentTarget).data('dismiss') || e.type === 'hide') {
		let lastAddedIndicator;

		for (let i = 0; i < $indicatorTypeSelect.val().length; i++) {
			if (
				!~Object.keys(app.state.indicators).indexOf(
					$indicatorTypeSelect.val()[i]
				)
			) {
				// set indicator name
				lastAddedIndicator = $indicatorTypeSelect.val()[i];
				break;
			}
		}

		const indexOption = $indicatorTypeSelect.val().indexOf(lastAddedIndicator);

		const selectValues = $indicatorTypeSelect.val();
		selectValues.splice(indexOption, 1);

		$indicatorTypeSelect.val(selectValues);
		$indicatorTypeSelect.selectpicker('render');
	}
}

// reset all settings
$resetBtn.on('click', function (e) {
	e.preventDefault();

	//set default theme
	$themeSelect.selectpicker('val', 'darkEarth');

	// reset app state
	app.state.settings.theme = 'darkEarth';
	app.state.settings.chartType = 'candlestick';
	app.state.indicators = {};
	app.state.annotations = {}

	// remove chart
	app.removeChart();


	// select series type
	$seriesTypeSelect.val('candlestick').selectpicker('refresh');
	
	// reset indicators select
	$indicatorTypeSelect.val('').selectpicker('refresh');
	
	// init, create chart
	app.createChart(chartContainer, true);
});

function getInputLabelText(keyText) {
	let text = '';
	const result = [];

	keyText.split(/(?=[A-Z])/).filter(function (item) {
		if (item.length === 1) {
			text += item;
		} else {
			text += ' ';
			text += item;
		}
	});
	text = text.trim();
	text = text[0].toUpperCase() + text.substr(1);

	text.split(' ').filter(function (item, index) {
		if (item.length === 1 && index !== text.split(' ').length - 1) {
			result.push(item + '-');
		} else {
			result.push(item);
		}
	});

	return result.join(' ').replace(/-\s/, '-');
}

function renderSelectOptions(value, isSeriesType) {
	let result = '';
	const items = isSeriesType ? seriesTypes : value;
	for (let item of items) {
		result += `<option value="${item}"${isSeriesType && item === value ? ' selected' : ''}>
			${isSeriesType ? getInputLabelText(item) : item}
		</option>`;
	}
	return result;
}

function renderIndicatorFormField(field, value) {
	switch (typeof value) {
		case 'number':
			return `<div class="col-sm-4">
				<div class="form-group">
					<label for="${field}" class="control-label">${getInputLabelText(field)}</label>
					<input name="${field}" type="number" class="form-control form-control-sm" id="${field}" value="${value}">
				</div>
			</div>`;
		case 'string':
			return `<div class="col-sm-4">
				<div class="form-group">
					<label for="${field}" class="control-label">${getInputLabelText(field)}</label>
					<select name="${field}" class="form-control form-control-sm select show-tick" data-style="btn-light btn-sm" id="">${renderSelectOptions(value, true)}</select>
				</div>
			</div>`
		case 'object':
			return `<div class="col-sm-4">
			<div class="form-group">
				<label for="${field}" class="control-label">${getInputLabelText(field)}</label>
				<select name="${field}" class="form-control form-control-sm select show-tick" data-style="btn-light btn-sm" id="">${renderSelectOptions(value)}</select>
			</div>
		</div>`
	}
}

function renderIndicatorForm(indicator) {
	let result = '';
	for (let key in indicator.defaults) {
		result += renderIndicatorFormField(key, indicator.defaults[key]);
	}
	result += `<div class="col-sm-12" id="overviewText">${indicator.description}</div>`
	return result;
}

function renderIndicatorDialog(indicator) {
	return `<div class="modal fade" id="indicatorSettingsModal" tabindex="-1" role="dialog" data-backdrop="static" data-keyboard="false">
            <div class="modal-dialog" role="document">
				<div class="modal-content">
					<form id="indicatorForm" class="form">
						<div class="modal-header">
							<h4 class="modal-title" id="indicatorSettingsModalTitle">
								${indicator.title}
							</h4>
							<button type="button" class="close" data-dismiss="modal" aria-label="Close">
								<span aria-hidden="true">&times;</span>
							</button>
						</div>
						<div class="modal-body">
							<div class="row">${renderIndicatorForm(indicator)}</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-default btn-sm" data-dismiss="modal">
								Close
							</button>
							<button type="submit" class="btn btn-primary btn-sm" id="addIndicatorButton">
								Add Indicator
							</button>
						</div>
					</form>
                </div>
            </div>
        </div>`
}

function setColClass($el) {
	const cols = $el.find('.col-sm-4');
	const colsCount = cols.length;
	const leftover = colsCount % 3;

	if (leftover) {
		for (let i = colsCount - leftover; i <= colsCount; i++) {
			$(cols[i]).removeClass('col-sm-4').addClass('col-sm-' + 12 / leftover);
		}
	}

}