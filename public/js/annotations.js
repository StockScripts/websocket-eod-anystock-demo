/* global 
  $: jQuery
  chart: chart instance
  app: application state and common functions
  $strokeSettings = $('.strokeSettings'); // stroke settings controls
  $markerSize = $('#select-marker-size'); // marker size select
  $markerType = $('#select-marker-type'); // marker size select
  $fontSize = $('#select-font-size'); // font size select
  $fontSettings = $('#select-font-style'); // font style select
  $annotationLabel = $('#annotation-label'); // input for the label text
  $labelMethod = $('[data-label-method]'); //  font settings select
  $fillColorPicker = $('[data-color="fill"]'); // fill color picker
  $strokeColorPicker = $('[data-color="stroke"]'); // stroke color picker
  $fontColorPicker = $('[data-color="fontColor"]'); // font color picker
  selectTools: function, enable toolbar for annotation type
*/
"use strict";

/**
 * color getter/setter
 * @param  {Object} el color picker element
 * @param  {string} color color string
 * @return {string} color string
 */
function colorHandler(el, color) {
  if (color)
    el.find('.color-fill-icon').css('background-color', color);
  return el.find('.color-fill-icon').css('background-color');
}


/**
 * update annotations in app state
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
 * create new annotation
 */
function newAnnotation() {
  //unselect selected annotations
  chart.annotations().unselect();
  setTimeout(() => {
    // get selected stroke settings
    const color = colorHandler($strokeColorPicker);
    let [thickness, dash] = $strokeSettings.map(function() {return this.value}).get();
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
    const stroke = {
      thickness,
      color,
      dash
    };

    // cancel drawing on Esc key pressed
    document.body.addEventListener('keydown', e => {
      if (e.keyCode === 27)
        chart.annotations().cancelDrawing();
    }, {once: true});

    // get annotation type
    const type = 
      $(this).data('annotationType') === 'drawing' ?
        $(this).val() :
        $(this).data('annotationType');

    // get annotation drawing settings
    const drawingSettings = getDrawingSettings(type, stroke);

    // start drawing annotation
    const annotation = chart.annotations().startDrawing(drawingSettings);

    // update app selects
    updatePropertiesBySelectedAnnotation(thickness, dash);

    // disable fill colorpicker if annotation hasn't fill
    if (type === 'drawing' && !annotation.fill) {
      $fontColorPicker.attr('disabled', 'disabled');
    } else {
      $fontColorPicker.removeAttr('disabled');
    }
  }, 1);
}


/**
 * annotation drawing settings getter
 * @param {string} type annotation type
 * @param {Object} stroke stroke settings
 * @return {Object} Drawing Settings
 */
function getDrawingSettings(type, stroke) {
  // get annotation drawing settings
  if (type) {
    let drawingSettings = {};
    if (type === 'marker') {
      const size = $markerSize.val();
      const markerType = $markerType.val();
      const anchor = $markerType.find('option:selected').data('markerAnchor');
      drawingSettings = {
        type,
        size,
        markerType,
        anchor
      }
    }
    if (type === 'label') {
      const fontSize = $fontSize.val();
      const fontColor = colorHandler($fontColorPicker);
      const fontSettings = normalizeFontSettings($fontSettings.val());
      let fill = $('#fill .color-fill-icon').css('background-color');
      const background = {
        fill,
        stroke
      }
      drawingSettings = Object.assign(fontSettings, {
        type,
        fontSize,
        fontColor,
        background
      });
    } else {
      const color = $('#fill .color-fill-icon').css('background-color');
      const opacity = .3;
      const fill = {
        color,
        opacity
      }
      drawingSettings = Object.assign(drawingSettings, {
        type,
        fill,
        stroke
      });
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
 */
function removeSelectedAnnotation() {
  const annotation = chart.annotations().getSelectedAnnotation();

  // remove annotation
  if (annotation) 
    chart.annotations().removeAnnotation(annotation);

  // disable remove button
  $('.btn[data-action-type="removeSelectedAnnotation"]').addClass('disabled');

  // update annotations in app state
  updateAnnotationsState();
}


/**
 * remove all annotations from chart
 */
function removeAllAnnotations() {
  // remove annotations
  chart.annotations().removeAllAnnotations();

  // update annotations in app.state
  updateAnnotationsState();
}


/**
 * annotation select event handler
 * @param {Object} e Event
 */
function onAnnotationSelect(e) {
  const annotation = e.annotation;
  let fill, color, thickness, dash;
  const annotationDrawingFunctions = annotation.getType() === 'label' ?
      annotation.background() :
      annotation;

  // activate toolbar for selected annotation
  const isDrawingTool = annotation.getType() !== 'label' && annotation.getType() !== 'marker';
  const type = isDrawingTool ? 'drawing' : annotation.getType();
  selectTools(type);
  $('.toolbar a[href="#annotation-panel"]').tab('show');

  if (annotation.getType() === 'label') {
    $annotationLabel.focus();

    // set font size select value
    const fontSize = annotation.fontSize();
    $fontSize.val(fontSize).selectpicker('refresh');

    // set font color to colorpicker button
    const fontColor = annotation.fontColor();
    colorHandler($fontColorPicker, fontColor);

    // update font settings select
    const fontSettings = [];
    $labelMethod.each(function() {
      const method = $(this).data('labelMethod');
      fontSettings.push(annotation[method]());
    });
    $fontSettings.val(fontSettings).selectpicker('refresh');
  }

  // disable fill colorpicker if annotation hasn't fill
  if (type === 'drawing' && !annotation.fill) {
    $fillColorPicker.attr('disabled', 'disabled');
  } else {
    $fillColorPicker.removeAttr('disabled');

    // get annotation fill
    fill = annotationDrawingFunctions.fill();
  }

  const annotationStroke = annotationDrawingFunctions.stroke();

  if (typeof annotationStroke === 'function') {
    // get annotation stroke & fill colors
    color = colorHandler($strokeColorPicker);
    fill = colorHandler($fillColorPicker);

    if (!fill.includes('a')) {
      fill = fill.replace('rgb', 'rgba').replace(')', ', 0.3)');
    }

    // get stroke settings values
    [thickness, dash] = $strokeSettings.map(function() {return this.value}).get();
  } else {
    // get stroke settings
    color = annotationStroke.color;
    thickness = annotationStroke.thickness;
    switch (annotationStroke.dash) {
      case `${thickness} ${thickness}`:
        dash = 'dotted';
        break;
      case '10 5':
        dash = 'dashed';
        break;
      default:
        dash = 'solid';
        break;
    }
  }

  if (annotation.getType() === 'marker') {
    // get marker size
    const markerSize = annotation.size();

    // update marker size select
    $markerSize.val(markerSize).selectpicker('refresh');
    annotation.size(markerSize);
  }

  if (fill)
    // set fill color picker button color
    colorHandler($fillColorPicker, fill.color);

  // set stroke color picker button color
  colorHandler($strokeColorPicker, color);

  // update stroke settings select
  $strokeSettings.val([thickness, dash]).selectpicker('refresh');

  // enable "remove annotation" button
  $('[data-action-type="removeSelectedAnnotation"]').removeClass('disabled');

  // enable toolbar for the selected annotation
  $('[data-toolbar-type]').removeClass('active');
  $(`[data-toolbar-type="${type}"]`).addClass('active');
}


/**
 * update annotation stroke settings
 * @param {number} thickness stroke thickness
 * @param {string} dash stroke dash
 */
function updatePropertiesBySelectedAnnotation(thickness, dash) {
  const annotation = chart.annotations().getSelectedAnnotation();
  if (annotation === null) return;

  // get annotation stroke settings
  const color = annotation.getType() === 'label' ?
    annotation.background().stroke().color :
    annotation.stroke().color;
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
 * update annotation stroke settings
 * @param {*} annotation selected annotation
 * @param {Object} settings new annotation settings
 */
function setAnnotationStrokeSettings(annotation, settings) {
  let annotationDrawingFunctions = annotation;
  if (annotation.getType() === 'label') {
    $annotationLabel.focus();
    annotationDrawingFunctions = annotation.background();
  }
  annotationDrawingFunctions.stroke(settings);
  if (annotationDrawingFunctions.hovered)
    annotationDrawingFunctions.hovered().stroke(settings);
  if (annotationDrawingFunctions.selected)
    annotationDrawingFunctions.selected().stroke(settings);
  
  updateAnnotationsState();
}


/**
 * create font settings method->value object from select values
 * @param {Array} val font settings select values
 * @return {Object} Object of font methods
 */
function normalizeFontSettings(val) {
  const fontMethods = {};

  $labelMethod.each(function() {
    fontMethods[$(this).data('labelMethod')] = null;
  });

  if (val)
    val.forEach(function(item) {
      if (item) {
        $fontSettings.find('[data-label-method]').each(function() {
          const $that = $(this);
          const $el = $that.find('option').length ?
            $that.find('option') :
            $that;

          $el.each(function() {
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

/**
 * handler for the labels text edit
 * @param {Object} e event object
 */
function textEditHandler(e) {
  let annotation;
  if (e.annotation.getType() === 'label') {
    $annotationLabel
      .val(e.annotation.text())
      .focus()
      .on('change keyup paste', function(e) {
        if (e.keyCode === 46) return;
        annotation = chart.annotations().getSelectedAnnotation();
        if (annotation) {
          $(this).val() ?
            annotation.text($(this).val()) :
            annotation.text(' ') && $(this).val(' ');
          updateAnnotationsState();
        }
      });
  }
}