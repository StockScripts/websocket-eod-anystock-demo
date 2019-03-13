/* global
  $: jQuery
  chart: chart instance
  $strokeSettings = $('.strokeSettings'); // stroke settings controls
  $fontSettings = $('#select-font-style'); // font style select
  removeSelectedAnnotation: function, remove selected annotation
  removeAllAnnotations: function, remove all annotations from chart
  updateAnnotationsState: function, update annotations in app state
  setAnnotationStrokeSettings: function, annotation stroke settings setter
*/
"use strict";

// event to set stroke dash icons according stroke width
$strokeSettings
  .filter('.size')
  .on('changed.bs.select refreshed.bs.select', function(e, i, sel, prev) {
    $strokeSettings
      .filter('.dash')
      .find('option')
      .each(function(index, item) {
        const iconClass = $(item).data('icon');
        const iconClassParts = iconClass.split('-');
        if (!prev)
          prev = iconClassParts[iconClassParts.length - 1];
        $(item).data('icon', iconClass.replace(prev, e.target.value));
      });
    $strokeSettings.filter('.dash').selectpicker('refresh');
  });


// event to remove font settings options text
$fontSettings.on('changed.bs.select refreshed.bs.select', function(e) {
  const $target = $(e.target);
  const icons = $target.next()
    .find('.filter-option-inner-inner')
    .find('i');
  $target.next()
    .find('.filter-option-inner-inner')
    .html('');
  for (const icon of icons) {
    $target.next()
      .find('.filter-option-inner-inner')
      .append(icon);
  }
});


/**
 * enable toolbar for annotation type
 * @param {String} toolbarType type of toolbar to enable
 */
function selectTools(toolbarType) {
  $('.tools[id]').hide();
  $('#' + toolbarType).show();
}


/**
 * init color pickers
 */
function createPageColorPicker() {
  // get color pickers containers
  const colorPicker = $('.colorpickerplus-dropdown .colorpickerplus-container');

  // init colorpickers
  colorPicker.colorpickerembed();

  // listen color changing
  colorPicker.on('changeColor', function(e, color) {
    //get annotation
    let annotation = chart.annotations().getSelectedAnnotation();
    let settings, opacity;
    
    const colorType = $(this).parents('.dropdown')
      .find('[data-color]')
      .data('color');
    
    if (annotation) {
      const type = annotation.getType();
      let annotationDrawingFunctions = annotation
      if (type === 'label')
        annotationDrawingFunctions = annotation.background();

      switch (colorType) {
        case 'fill':
          opacity = type === 'label' ? 1 : 0.3;
          annotationDrawingFunctions.fill(color, opacity);
          updateAnnotationsState();
          break;
        case 'stroke':
          settings = annotationDrawingFunctions.stroke();
          settings.color = color;
          setAnnotationStrokeSettings(annotation, settings);
          break;
        case 'fontColor':
          if (annotation.getType() === 'label')
            annotation.fontColor(color);
          updateAnnotationsState();
          break;
      }
    }
    if (color === null) {
      $(`#${colorType} .color-fill-icon`)
        .addClass('colorpicker-color');
    } else {
      $(`#${colorType} .color-fill-icon`)
        .removeClass('colorpicker-color')
        .css('background-color', color);
    }
  });
}


/**
 * init application tooltips
 * @param {String} placement tooltip placement
 */
function initTooltip(placement) {
  $(document).ready(function() {
    $('[data-title]').tooltip({
      trigger: 'hover',
      placement,
      animation: false
    });
  });

  $('.selectpicker').on('loaded.bs.select', function(e) {
    const btn = $(e.target).next('button');
    if (btn.length) {
      $(btn).tooltip({
        trigger: 'hover',
        placement
      });
      $(btn).attr('data-original-title', $(e.target).data('tooltip-title'))
    }
  });
}


/**
 * create context menu items for annotations (remove and remove all)
 * @param {Object} items context menu items
 * @return {Object} updated context menu items object
 */
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
    action: removeAllAnnotations,
    index: -5
  };

  // insert context menu separator
  items['annotations-separator'] = {
    index: -4
  };

  return items;
}


initTooltip('bottom');
createPageColorPicker();
