/* global
  $: jQuery
  anychart: anychart component
  chart: chart instance
  $loader = $('#loader'); // anychart preloader
  $annotationLabel = $('#annotation-label'); // textarea for annotation label
  $strokeSettings = $('.strokeSettings'); // stroke settings controls
  $markerSize = $('#select-marker-size'); // marker size select
  $fontSize = $('#select-font-size'); // font size select
  $fontSettings = $('#select-font-style'); // font style select
  $labelMethod = $('[data-label-method]'); //  font settings select
  newAnnotation: function, change chart's annotations handler
  updateAnnotationsState: function, update annotations in app state
  selectTools: function, enable toolbar for annotation type
  removeSelectedAnnotation: function, remove selected annotation
  removeAllAnnotations: function, remove all annotations from chart
  updatePropertiesBySelectedAnnotation: function, update annotation stroke settings
  normalizeFontSettings: function, create font settings method->value object from select values
  textEditHandler: function, handler for labels text edit
  onAnnotationSelect: function, annotation select event handler
  drawAnnotations: function, draw annotations using settings from app state
*/
"use strict";

anychart.onDocumentReady(function() {
  // listen chart's annotatons change
  chart.listen('annotationChange', updateAnnotationsState)
  

  // listen chart's annotation select
  chart.listen('annotationSelect', e => {
    textEditHandler(e);
    onAnnotationSelect(e);
  });
  

  // use annotation events to update application UI elements
  chart.listen('annotationUnSelect', () => {
    $('.color-picker[data-color="fill"]').removeAttr('disabled');
    $('.select-marker-size').removeAttr('disabled');
    $('[data-action-type="removeSelectedAnnotation"]').addClass('disabled');
  });
  

  // update textarea content 
  chart.listen('annotationDrawingFinish', e => {
    if (e.annotation.getType() === 'label') {
      $annotationLabel
        .focus()
        .val('') // Safari cursor position workaround
        .val(e.annotation.text());
      textEditHandler(e);
    }
    updateAnnotationsState();
  });
  

  //data updated event
  chart.listen('dataChanged', () => {
    drawAnnotations(app.state.annotations);
    
    // restore selected range
    const {min, max} = app.state.settings.currentRange || {};
    chart.selectRange(min, max, true);
  });
  

  // update current range in app state
  chart.listen('selectedRangeChangeFinish', function() {
    app.state.settings.currentRange = {
      min: chart.getSelectedRange().firstSelected,
      max: chart.getSelectedRange().lastSelected
    };
    $('.btn[data-action-type="saveAppState"]').removeClass('disabled');
  });
  
  
  // bootstrap-select dropdown close listener
  $('select').on('hidden.bs.select', function(e) {
    // trigger blur event for the bootstrap-select dropdown button
    if ($(e.target).data('focusOff')) 
      setTimeout(() => $(e.currentTarget).find('button').blur(), 0);
  })
  
  
  // drawing tools & marker type change listener
  $('select.choose-drawing-tools, select.choose-marker').on('change', newAnnotation);
  
  
  // drawing tools & marker type dropdown show listener
  $('select.choose-drawing-tools, select.choose-marker').on('shown.bs.select', e => {
    // set blank value for the select and refresh select-picker element 
    $(e.target).val('').selectpicker('refresh');
    // unselect annotations, if drawing tools or marker type dropdown shown
    chart.annotations().unselect();
  });
  
  
  // new label button click listener
  $('#newLabel').click(newAnnotation);
  
  
  // annotation auto-size button click listener
  $('#annotation-label-autosize').on('click', function() {
    // get selected annotation
    const annotation = chart.annotations().getSelectedAnnotation();
    if (annotation && annotation.getType() === 'label') {
      // set annotation width & height
      annotation.width(null);
      annotation.height(null);
    }
  
    // enable lable text editing
    $annotationLabel.focus();
  
    // update annotations in the app state
    updateAnnotationsState();
  });
  
  
  // toolbar type buttons click listener
  $('.btn[data-toolbar-type]').click(function() {
    // get toolbar type
    const toolbarType = $(this).data('toolbarType');
    // switch tools for the toolbar type
    selectTools(toolbarType);
  });
  
  
  // action buttons click listener
  $('.btn[data-action-type]').click(function(e) {
    const $target = $(e.currentTarget); // get target 
    // trigger blur event for the target button
    $target.blur();
  
    // get button action type
    const type = $target.attr('data-action-type'); // get action type
  
    switch (type) {
      case 'removeAllAnnotations':
        removeAllAnnotations();
        break;
      case 'removeSelectedAnnotation':
        removeSelectedAnnotation();
        break;
      case 'unSelectedAnnotation':
        chart
          .annotations()
          .unselect()
          .cancelDrawing();
        break;
      case 'saveAppState':
        if ($('.btn[data-action-type="saveAppState"]').hasClass('disabled')) {
          break;
        }
        localStorage.setItem('state', JSON.stringify(app.state));
        $('.btn[data-action-type="saveAppState"]').addClass('disabled');
        break;
    }
  });
  
  
  // stroke settings change listener
  $strokeSettings.on('change', function() {
    const [thickness, dash] = $strokeSettings.map(function() {return this.value}).get();
    updatePropertiesBySelectedAnnotation(thickness, dash);
  });
  
  
  // marker size change listener
  $markerSize.on('change', function() {
    const annotation = chart.annotations().getSelectedAnnotation();
  
    if (annotation && annotation.getType() === 'marker') 
      annotation.size($(this).val());
    updateAnnotationsState();
  });
  
  
  // font size change listener
  $fontSize.on('change', function() {
    const annotation = chart.annotations().getSelectedAnnotation();
  
    if (annotation && annotation.getType() === 'label')
      annotation.fontSize($(this).val());
    updateAnnotationsState();
  });
  
  
  // font settings change listener
  $fontSettings.on('change', function() {
    const annotation = chart.annotations().getSelectedAnnotation();
  
    if (annotation && annotation.getType() === 'label') {
      const fontSettings = normalizeFontSettings($(this).val());
  
      $labelMethod.each(function() {
        const method = $(this).data('labelMethod');
        annotation[method](fontSettings[method]);
      });
  
      $annotationLabel.focus();
    }
    updateAnnotationsState();
  });
  
  
  // bind hotkey to remove annotation
  $('html').keyup(function(e) {
    if (e.keyCode === 93 || e.keyCode === 46) {
      removeSelectedAnnotation();
    }
  });
});
