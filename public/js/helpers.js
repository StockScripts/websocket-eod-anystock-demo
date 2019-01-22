function setColClass($el) {
	// column count for row
	var ROW_COUNT = 12;
	var COLUMN_COUNT = 3;
	var index = $el.find('.col-sm-4').length;
	var lastIndex = $el
		.find('.col-sm-4')
		.last()
		.index();
	var colClass;

	if (index === COLUMN_COUNT) {
		return;
	}

	if (index > COLUMN_COUNT) {
		while (index > COLUMN_COUNT) {
			index -= COLUMN_COUNT;
		}
	}

	colClass = ROW_COUNT / index;

	while (index) {
		--index;
		$el
			.find($("[class*='col-sm-']"))
			.eq(lastIndex - index)
			.removeClass('col-sm-4')
			.addClass('col-sm-' + colClass);
	}
}