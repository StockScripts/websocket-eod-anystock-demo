"use strict";

/**
 * update annotations in app state
 * @returns {void}
 */
function updateAnnotationsState() {
  for (let i=0; i < chart.getPlotsCount(); i++) {
    if (chart.plot(i).annotations().getAnnotationsCount() !== 0) {
      let json = chart
        .plot(i)
        .annotations()
        .toJson(true);
      app.state.annotations[i] = json;
    } else if (chart.plot(i).getSeriesCount() === 0) {
      chart.plot(i, false);
    }
  }
  $('.btn[data-action-type="saveAppState"]').removeClass('disabled');
}

/**
 * change chart's annotations handler
 * @returns {void}
 */
function changeAnnotations() {
  //unselect selected annotations
  let annotation = chart.annotations().getSelectedAnnotation();
  if (annotation) 
    chart.annotations().unselect();
  setTimeout(() => {
    const $target = $(this);
    
    const thickness = $strokeSettings.filter('.size').val();
    const color = $('#stroke .color-fill-icon').css('background-color');
    let dash;
    let annotation = chart.annotations().getSelectedAnnotation();

    switch ($strokeSettings.filter('.dash').val()) {
      case 'solid':
        dash = null;
        break;
      case 'dotted':
        dash = `${thickness} ${thickness}`;
        break;
      case 'dashed':
        dash = '10 5';
        break;
    }

    const stroke = {
      thickness,
      color,
      dash
    };

    document.body.addEventListener('keydown', escape, {once: true});

    function escape(e) {
      if (e.keyCode === 27)
        chart.annotations().cancelDrawing();
    }

    const type = 
      $target.data().annotationType === 'drawing' 
        ? $target.val() 
        : $target.data().annotationType;

    const drawingSettings = getDrawingSettings(type, stroke);

      if (!annotation) 
        annotation = chart.annotations().startDrawing(drawingSettings);

    updatePropertiesBySelectedAnnotation(thickness, dash);

    if (annotation &&!annotation.fill && (!annotation.background || !annotation.background().fill)) {
      $('#fill').attr('disabled', 'disabled');
    } else {
      $('#fill').removeAttr('disabled');
    }
  }, 1);
}

/**
 * annotation drawing settings getter
 * @param  {String} type annotation type
 * @param  {Object} stroke stroke settings
 * @returns {Object} Drawing Settings
 */
function getDrawingSettings(type, stroke) {
  // get annotation drawing settings
  if (type) {
		let drawingSettings;

    if (type === 'marker') {
      const size = $markerSize.val();
			const markerType = $markerType.val();
			const anchor = $markerType.find('option:selected').data().markerAnchor;
			drawingSettings = {
				type,
				size,
				markerType,
				anchor
			}
    }

    if (type === 'label') {
			const fontSize = $fontSize.val();
      const fontColor = $('[data-color="fontColor"]').find('.color-fill-icon').css('background-color');
			const fontSettings = normalizeFontSettings($fontSettings.val());
			let fill = $('#fill .color-fill-icon').css('background-color');
			const background = {
				fill,
				stroke
			}
			drawingSettings = {
				...fontSettings,
				type,
				fontSize,
				fontColor,
				background
			}
    } else {
			const color = $('#fill .color-fill-icon').css('background-color');
			const opacity = .3;
			const fill = {
				color,
				opacity
			}
			drawingSettings = {
				...drawingSettings,
				type,
				fill,
				stroke
			}
    }
		drawingSettings.hovered = {
			stroke
		};
		drawingSettings.selected = {
			stroke
		};
		return drawingSettings;
  }
}

/**
 * remove selected annotation
 * @returns {void}
 */
function removeSelectedAnnotation() {
  const annotation = chart.annotations().getSelectedAnnotation();
  if (annotation) 
    chart.annotations().removeAnnotation(annotation);
  $('.btn[data-action-type="removeSelectedAnnotation"]').addClass('disabled');
  updateAnnotationsState();
}

/**
 * remove all annotations from chart
 * @returns {void}
 */
function removeAllAnnotation() {
  chart.annotations().removeAllAnnotations();
  updateAnnotationsState();
}

/**
 * annotation select event handler
 * @param  {Object} evt Event
 * @returns {void}
 */
function onAnnotationSelect(evt) {
  let annotation = evt.annotation;
  let colorFill;
  let colorStroke;
  let strokeWidth;
  let strokeDash;
  let $colorPickerFill = $('[data-color="fill"]');
  let $colorPickerStroke = $('[data-color="stroke"]');
  let $colorPickerFontColor = $('.color-picker[data-color="fontColor"]');

  // activate toolbar for selected annotation
  const isDrawingTool = annotation.type !== 'label' && annotation.type !== 'marker';
  const toolbarType = isDrawingTool ? 'drawing' : annotation.type;
  selectTools(toolbarType);
  $('.toolbar a[href="#annotation-panel"]').tab('show');

  if (annotation.type === 'label') {
    $annotationLabel.focus();

    // set font size select value
    const fontSize = annotation.fontSize();
    $fontSize.val(fontSize).selectpicker('refresh');

    // set font color to colorpicker button
    const fontColor = annotation.fontColor();
    $colorPickerFontColor.find('.color-fill-icon').css('background-color', fontColor);

    // update font settings select
    const fontSettings = [];
    $labelMethod.each(function () {
      const method = $(this).data().labelMethod;
      fontSettings.push(annotation[method]());
    });
    $fontSettings.val(fontSettings).selectpicker('refresh');

    annotation = annotation.background();
  }
  if (annotation.fill !== undefined) {
    $colorPickerFill.removeAttr('disabled');
    colorFill = annotation.fill();
  } else {
    $colorPickerFill.attr('disabled', 'disabled');
  }

  const annotationStroke = annotation.stroke();

  if (typeof annotationStroke === 'function') {
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
    colorStroke = annotationStroke.color;
    strokeWidth = annotationStroke.thickness;
    switch (annotationStroke.dash) {
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
    const markerSize = annotation.size();

    $markerSize.val(markerSize).selectpicker('refresh');
    annotation.size(markerSize);
  }

  if (colorFill)
    $colorPickerFill.find('.color-fill-icon').css('background-color', colorFill.color);

  $colorPickerStroke.find('.color-fill-icon').css('background-color', colorStroke);

  $strokeSettings.val([strokeWidth, strokeDash]).selectpicker('refresh');

  $('[data-action-type="removeSelectedAnnotation"]').removeClass('disabled');

  $('[data-toolbar-type]').removeClass('active');
  $(`[data-toolbar-type="${toolbarType}"]`).addClass('active');
}
/**
 * update annotation stroke settings
 * @param  {Number} thickness stroke thickness
 * @param  {String} dash stroke dash
 * @returns {void}
 */
function updatePropertiesBySelectedAnnotation(thickness, dash) {
  let color;
  const annotation = chart.annotations().getSelectedAnnotation();
  if (annotation === null) return;

  if (annotation.type === 'label') {
    color = annotation.background().stroke().color;
  } else {
    color = annotation.stroke().color;
  }

  switch (dash) {
    case 'solid':
      dash = null;
      break;
    case 'dotted':
      dash = `${thickness} ${thickness}`;
      break;
    case 'dashed':
      dash = '10 5';
      break;
  }

  const settings = {
    thickness,
    color,
    dash
  };

  setAnnotationStrokeSettings(annotation, settings);
}

/**
 * annotation stroke settings setter
 * @param  {any} annotation selected annotation
 * @param  {Object} settings new annotation settings
 * @returns {void}
 */
function setAnnotationStrokeSettings(annotation, settings) {
  if (annotation.type === 'label') {
    $annotationLabel.focus();
    annotation = annotation.background();
  }
  annotation.stroke(settings);
  if (annotation.hovered)
    annotation.hovered().stroke(settings);
  if (annotation.selected)
    annotation.selected().stroke(settings);
  
  updateAnnotationsState();
}

/**
 * create font settings method->value object from select values
 * @param  {Array} val font settings select values
 * @returns {Object} Object of font methods
 */
function normalizeFontSettings(val) {
  const fontMethods = {};

  $labelMethod.each(function () {
    fontMethods[$(this).data().labelMethod] = null;
  });

  if (val)
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
