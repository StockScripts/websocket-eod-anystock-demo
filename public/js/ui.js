"use strict";

// event to set stroke dash icons according stroke width
$strokeSettings
  .filter('.size')
  .on('changed.bs.select refreshed.bs.select', function (e, i, sel, prev) {
    $strokeSettings
      .filter('.dash')
      .find('option')
      .each(function (index, item) {
        const iconClass = $(item).data('icon');
        const iconClassParts = iconClass.split('-');
        if (!prev)
          prev = iconClassParts[iconClassParts.length - 1];
        $(item).data('icon', iconClass.replace(prev, e.target.value));
      });
    $strokeSettings.filter('.dash').selectpicker('refresh');
  });

// event to remove font settings options text
$fontSettings.on('changed.bs.select refreshed.bs.select', function (evt) {
  const icons = $(evt.target).next()
    .find('.filter-option-inner-inner')
    .find('i');
  $(evt.target).next()
    .find('.filter-option-inner-inner')
    .html('');
  for (const icon of icons) {
    $(evt.target).next()
      .find('.filter-option-inner-inner')
      .append(icon);
  }
});

/**
 * enable toolbar for annotation type
 * @param  {String} toolbarType type of toolbar to enable
 * @returns {void}
 */
function selectTools(toolbarType) {
  $('.tools[id]').hide();
  $('#' + toolbarType).show();
}

/**
 * init color pickers
 * @returns {void}
 */
function createPageColorPicker() {
  // get color pickers containers
  const colorPicker = $('.colorpickerplus-dropdown .colorpickerplus-container');

  // init colorpickers
  colorPicker.colorpickerembed();

  // listen color changing
  colorPicker.on('changeColor', function (e, color) {
    //get annotation
    let annotation = chart.annotations().getSelectedAnnotation();
    let thickness, dash, settings, opacity;
    
    const colorType = $(this).parents('.dropdown')
    .find('[data-color]')
    .data('color');
    
    if (annotation) {
      const type = annotation.type;
      let annotationColors = annotation
      if (type === 'label')
        annotationColors = annotation.background();

      switch (colorType) {
        case 'fill':
          opacity = type === 'label' ? 1 : 0.3;
          annotationColors.fill(color, opacity);
          updateAnnotationsState();
          break;
        case 'stroke':
          thickness = annotationColors.stroke().thickness;
          dash = annotationColors.stroke().dash;
          settings = {
            thickness,
            color,
            dash
          };
          setAnnotationStrokeSettings(annotation, settings);
          break;
        case 'fontColor':
          window.annotation = annotation;
          if (annotation.type === 'label')
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
 * @param  {String} placement tooltip placement
 * @returns {void}
 */
function initTooltip(placement) {
  $(document).ready(function () {
    $('[data-title]').tooltip({
      trigger: 'hover',
      placement,
      animation: false
    });
  });

  $('.selectpicker').on('loaded.bs.select', function (e) {
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
 * @param  {Object} items context menu items
 * @returns {Object} updated context menu items object
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
    action: removeAllAnnotation,
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
