/*global $, app, chart, $strokeSettings, $markerSize, $fontSize, $fontSettings, $annotationLabel, $labelMethod, normalizeFontSettings, updatePropertiesBySelectedAnnotation, selectTools, removeAllAnnotation, removeSelectedAnnotation,  changeAnnotations, updateAnnotationsState */

// blur dropdown after select
$('select').on('hidden.bs.select', function(e) {
    if ($(e.target).data('focusOff')) setTimeout(() => $(e.currentTarget).find('button').blur(), 1);
})

// listeners for annotation controls
$('select.choose-drawing-tools, select.choose-marker').on('change', changeAnnotations);
$('select.choose-drawing-tools, select.choose-marker').on('shown.bs.select', () => {
    let annotation = chart.annotations().getSelectedAnnotation();
	if (annotation) chart.annotations().unselect();
});
$('#newLabel').click(changeAnnotations);
$('#annotation-label-autosize').on('click', function () {
    // set text's bounds as an annotation size
    const annotation = chart.annotations().getSelectedAnnotation();
    if (annotation && annotation.type === 'label') {
        annotation.width(null);
        annotation.height(null);
    }

    $annotationLabel.focus();
    updateAnnotationsState();
});

// switch toolbar type
$('.btn[data-toolbar-type]').click(function () {
    const toolbarType = $(this).data().toolbarType;
    selectTools(toolbarType);
});

// listener for action buttons
$('.btn[data-action-type]').click(function (evt) {
    const annotation = chart.annotations().getSelectedAnnotation(); // get selected annotation
    const $target = $(evt.currentTarget); // get target 
    $target.blur();
    const type = $target.attr('data-action-type'); // get action type

    switch (type) {
        case 'removeAllAnnotations':
            removeAllAnnotation();
            break;
        case 'removeSelectedAnnotation':
            removeSelectedAnnotation();
            break;
        case 'unSelectedAnnotation':
            chart
                .annotations()
                .unselect(annotation)
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

// listener for stroke settings(size & width) select
$strokeSettings.on('change', function () {
    const strokeWidth = $strokeSettings.filter('.size').val();
    const strokeType = $strokeSettings.filter('.dash').val();
    updatePropertiesBySelectedAnnotation(strokeWidth, strokeType);
});

// marker size select
$markerSize.on('change', function () {
    const annotation = chart.annotations().getSelectedAnnotation();

    if (annotation === null) return;

    if (annotation.type === 'marker') {
        annotation.size($(this).val());
    }
});

// font size select
$fontSize.on('change', function () {
    const annotation = chart.annotations().getSelectedAnnotation();

    if (annotation === null) return;

    if (annotation.type === 'label') {
        annotation.fontSize($(this).val());
    }
    updateAnnotationsState();
});

// font settings
$fontSettings.on('change', function () {
    const annotation = chart.annotations().getSelectedAnnotation();

    if (annotation && annotation.type === 'label') {
        const fontSettings = normalizeFontSettings($(this).val());

        $labelMethod.each(function () {
            const method = $(this).data().labelMethod;
            annotation[method](fontSettings[method]);
        });

        $annotationLabel.focus();
    }
    updateAnnotationsState();
});

// bind hotkey for remove annotation
$('html').keyup(function (e) {
    if (e.keyCode === 93 || e.keyCode === 46) {
        removeSelectedAnnotation();
    }
});