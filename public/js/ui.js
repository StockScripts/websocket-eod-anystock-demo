$strokeSettings
	.filter('.size')
	.on('changed.bs.select refreshed.bs.select', function(e, i, sel, prev) {
		$strokeSettings
			.filter('.dash')
			.find('option')
			.each(function(index, item) {
				if (!prev) prev = $(item).data('icon').split('-')[$(item).data('icon').split('-').length - 1];
				$(item).data(
					'icon',
					$(item)
						.data('icon')
						.replace(prev, e.target.value)
				);
			});
		$strokeSettings.filter('.dash').selectpicker('refresh');
	});

$fontSettings.on('changed.bs.select refreshed.bs.select', function(evt) {
	var icons = $(evt.target).next().find('.filter-option-inner-inner').find('i');
	$(evt.target).next().find('.filter-option-inner-inner').html('');
	for (const icon of icons) {
		$(evt.target).next().find('.filter-option-inner-inner').append(icon);
	}
});

function selectTools(toolbarType) {
	$('.tools[id]').hide();
	$('#' + toolbarType).show();
}

function createPageColorPicker() {
	var colorPicker = $('.colorpickerplus-dropdown .colorpickerplus-container');
	var strokeWidth;
	var STROKE_WIDTH = 1;
	colorPicker.colorpickerembed();
	colorPicker.on('changeColor', function(e, color) {
		var annotation = chart.annotations().getSelectedAnnotation();
		var _annotation = annotation;

		if (annotation) {
			if (annotation.type === 'label') {
				$annotationLabel.focus();
				annotation = annotation.background();
			}

			switch (
				$(this)
					.parents('.dropdown')
					.find('[data-color]')
					.data('color')
			) {
				case 'fill':
                    annotation.fill(color, 0.3);
                    $('.btn[data-action-type = "saveAnno"]').removeClass('disabled');
					break;
				case 'stroke':
					strokeWidth = annotation.stroke().thickness || STROKE_WIDTH;
					var strokeDash = annotation.stroke().dash || '';
					var settings = {
						thickness: strokeWidth,
						color: color,
						dash: strokeDash
					};
					setAnnotationStrokeSettings(annotation, settings);
					break;
				case 'fontColor':
					if (_annotation.type === 'label') _annotation.fontColor(color);
					break;
			}
		}

		if (color === null) {
			$(
				'#' +
					$(this)
						.parents('.dropdown')
						.find('[data-color]')
						.data('color') +
					' .color-fill-icon'
			).addClass('colorpicker-color');
		} else {
			$(
				'#' +
					$(this)
						.parents('.dropdown')
						.find('[data-color]')
						.data('color') +
					' .color-fill-icon'
			).removeClass('colorpicker-color');
			$(
				'#' +
					$(this)
						.parents('.dropdown')
						.find('[data-color]')
						.data('color') +
					' .color-fill-icon'
			).css('background-color', color);
		}
	});
}

function initTooltip(position) {
	$(document).ready(function() {
		$('[data-title]').tooltip({
			trigger: 'hover',
			placement: position,
			animation: false
		});
	});

	$('.selectpicker').on('loaded.bs.select', function(e) {
		var btn = $(e.target).next('button');
		if (btn.length) {
			$(btn).tooltip({
				trigger: 'hover',
				placement: position
			});
			$(btn).attr('data-original-title', $(e.target).data('tooltip-title'))
		}
	});
}

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