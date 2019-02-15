/* exported el */
function el(tagName, attributes, childrens) {
	var element = document.createElement(tagName);

	if (typeof attributes === 'object') {
		Object.keys(attributes).forEach(function (i) {
			element.setAttribute(i, attributes[i]);
		});
	}
	if (typeof childrens === 'string') {
		element.textContent = childrens;
	} else if (childrens instanceof Array) {
		childrens.forEach(function (child) {
			element
				.appendChild(child);
		});
	}
	return element;
}
