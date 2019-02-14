/* global $, app, selectTools, chart, $annotationLabel, $fontSize, $labelMethod, $fontSettings, $strokeSettings, $markerSize */
/* exported updateAnnotationsState, changeAnnotations, removeSelectedAnnotation, removeAllAnnotation, onAnnotationSelect, updatePropertiesBySelectedAnnotation, normalizeFontSettings */

"use strict";

let annotationsColor;

function updateAnnotationsState() {
	for (let i=0; i < chart.getPlotsCount(); i++) {
		let json = chart
			.plot(i)
			.annotations()
			.toJson(true);
		app.state.annotations['annotationsList' + i] = json;
	}
	$('.btn[data-action-type="saveAppState"]').removeClass('disabled');
}

function changeAnnotations() {
	setTimeout(() => {
		const $target = $(this);
		const markerSize = $markerSize.val();
		const fontSize = $fontSize.val();
		const fontColor = $('[data-color="fontColor"]')
			.find('.color-fill-icon')
			.css('background-color');

		const colorFill = $('#fill .color-fill-icon').css('background-color');
		const colorStroke = $('#stroke .color-fill-icon').css('background-color');

		const strokeWidth = $strokeSettings.filter('.size').val();
		let strokeDash;
		let annotation = chart.annotations().getSelectedAnnotation();

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

		const strokeSettings = {
			thickness: strokeWidth,
			color: colorStroke,
			dash: strokeDash
		};

		const fontSettings = normalizeFontSettings($fontSettings.val());

		document.body.addEventListener('keydown', escape, {
			once: true
		});

		function escape(e) {
			if (e.keyCode === 27) {
				chart.annotations().cancelDrawing();
			}
		}

		const type = $target.data().annotationType;

		const drawingSettings = {
			type: type === 'drawing' ? $target.val() : type,
			color: annotationsColor
		};

		// get annotation drawing settings
		if (type) {
			if (type === 'marker') {
				drawingSettings.size = markerSize;
				drawingSettings.markerType = $target.val();
				drawingSettings.anchor = $target.find('option:selected').data()
					.markerAnchor;
			}

			if (type === 'label') {
				$.extend(drawingSettings, fontSettings);

				drawingSettings.fontSize = fontSize;
				drawingSettings.fontColor = fontColor;
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
			if (!annotation) annotation = chart.annotations().startDrawing(drawingSettings);
		}

		updatePropertiesBySelectedAnnotation(strokeWidth, strokeDash);

		if (annotation &&!annotation.fill && (!annotation.background || !annotation.background().fill)) {
			$('#fill').attr('disabled', 'disabled');
		} else {
			$('#fill').removeAttr('disabled');
		}
	}, 1);
}


function removeSelectedAnnotation() {
	const annotation = chart.annotations().getSelectedAnnotation();
	if (annotation) chart.annotations().removeAnnotation(annotation);
	$('.btn[data-action-type="removeSelectedAnnotation"]').addClass('disabled');
	updateAnnotationsState();
	return !!annotation;
}

function removeAllAnnotation() {
	chart.annotations().removeAllAnnotations();
	updateAnnotationsState();
}

function onAnnotationSelect(evt) {
	let annotation = evt.annotation;
	let colorFill;
	let colorStroke;
	let strokeWidth;
	let strokeDash;
	let markerSize;
	let fontColor;
	let fontSize;
	let $colorPickerFill = $('[data-color="fill"]');
	let $colorPickerStroke = $('[data-color="stroke"]');
	let $colorPickerFontColor = $('.color-picker[data-color="fontColor"]');

	let fontSettings = [];

	// activate toolbar for selected annotation
	const toolbarType =
		annotation.type !== 'label' && annotation.type !== 'marker' ?
		'drawing' :
		annotation.type;
	selectTools(toolbarType);
	$('.toolbar a[href="#annotation-panel"]').tab('show');

	if (annotation.type === 'label') {
		$annotationLabel.focus();

		fontSize = annotation.fontSize();

		$fontSize.val(fontSize).selectpicker('refresh');

		fontColor = annotation.fontColor();

		fontSettings = [];

		$labelMethod.each(function () {
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
		strokeWidth = $strokeSettings.filter('.size').val() || 1;

		strokeDash = $strokeSettings.filter('.dash').val();
	} else {
		colorStroke = annotation.stroke().color;
		strokeWidth = annotation.stroke().thickness;
		switch (annotation.stroke().dash) {
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
	}

	if (annotation.type === 'marker') {
		markerSize = annotation.size();

		$markerSize
			.removeAttr('disabled')
			.val(markerSize)
			.selectpicker('refresh');
		annotation.size(markerSize);
	} else {
		$markerSize.attr('disabled', 'disabled');
	}
	if (colorFill) {
		$colorPickerFill
			.find('.color-fill-icon')
			.css('background-color', colorFill.color);
	}
	$colorPickerStroke
		.find('.color-fill-icon')
		.css('background-color', colorStroke);
	$colorPickerFontColor
		.find('.color-fill-icon')
		.css('background-color', fontColor);
	$strokeSettings.val([strokeWidth, strokeDash]).selectpicker('refresh');

	$('[data-action-type="removeSelectedAnnotation"]').removeClass('disabled');

	$(`[data-toolbar-type]`).removeClass('active');
	$(`[data-toolbar-type="${toolbarType}"]`).addClass('active');
}

function updatePropertiesBySelectedAnnotation(strokeWidth, strokeType) {
	let strokeColor;
	const annotation = chart.annotations().getSelectedAnnotation();
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
	updateAnnotationsState();
}

function normalizeFontSettings(val) {
	const fontMethods = {};

	$labelMethod.each(function () {
		fontMethods[$(this).data().labelMethod] = null;
	});

	val &&
		val.forEach(function (item) {
			if (item) {
				$fontSettings.find('[data-label-method]').each(function () {
					const $that = $(this);
					const $el = $(this).find('option').length ?
						$(this).find('option') :
						$(this);

					$el.each(function () {
						if ($(this).val() === item) {
							fontMethods[$that.attr('data-label-method')] = item;
						}
					});
				});
			}
		});

	
	updateAnnotationsState();

	return fontMethods;
}