/* global $, selectTools, chart, $annotationLabel, $fontSize, $labelMethod, $fontSettings, $strokeSettings, $markerSize */
/* exported removeSelectedAnnotation, removeAllAnnotation, onAnnotationSelect, updatePropertiesBySelectedAnnotation, normalizeFontSettings */

"use strict";
function removeSelectedAnnotation() {
	var annotation = chart.annotations().getSelectedAnnotation();
	if (annotation) chart.annotations().removeAnnotation(annotation);
	return !!annotation;
}

function removeAllAnnotation() {
	chart.annotations().removeAllAnnotations();
	localStorage.removeItem('annotationsList');
}

function onAnnotationSelect(evt) {
	var annotation = evt.annotation;
	var colorFill;
	var colorStroke;
	var strokeWidth;
	var strokeDash;
	var markerSize;
	var fontColor;
	var fontSize;
	var $colorPickerFill = $('[data-color="fill"]');
	var $colorPickerStroke = $('[data-color="stroke"]');
	var $colorPickerFontColor = $('.color-picker[data-color="fontColor"]');

	var fontSettings = [];

    // activate toolbar for selected annotation
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
	$('.btn[data-action-type = "saveAnno"]').removeClass('disabled');
	annotation.stroke(settings);
	if (annotation.hovered || annotation.selected) {
		annotation.hovered().stroke(settings);
		annotation.selected().stroke(settings);
	}
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