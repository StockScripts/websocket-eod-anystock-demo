function createHtmlToIndicatorForm() {
    var $indicatorFormGroup;
    var indicatorSettings =
      indicatorsSettings.defaultSettings[indicatorsSettings.name];
    var $option;
    var i = 0;

    $('#indicatorSettingsModalTitle').text(
      indicatorsSettings.defaultSettings[indicatorsSettings.name].overview.title
    );

    // empty form
    $indicatorForm.empty();
    // create row
    $indicatorForm.append('<div class="row"></div>');
    var $indicatorFormRow = $indicatorForm.find('.row');

    for (var key in indicatorSettings) {
      if (
        indicatorSettings.hasOwnProperty(key) &&
        key !== 'overview' &&
        key !== 'plotIndex'
      ) {
        if (typeof indicatorSettings[key] === 'string') {
          $indicatorFormRow.append(selectHtml);
          $indicatorFormGroup = $('#indicatorFormGroup');
          $indicatorFormGroup.find('select').attr('id', key);
          $indicatorFormGroup
            .find('label')
            .attr('for', key)
            .text(getInputLabelText(key));

          for (i = 0; i < indicatorsSettings.seriesType.length; i++) {
            $option = $('<option></option>');
            $option.val(indicatorsSettings.seriesType[i].toLowerCase());
            $option.text(getInputLabelText(indicatorsSettings.seriesType[i]));
            $indicatorFormGroup.find('select').append($option);
          }

          $indicatorFormGroup.removeAttr('id');
        } else if (typeof indicatorSettings[key] === 'number') {
          $indicatorFormRow.append(inputHtml);
          $indicatorFormGroup = $('#indicatorFormGroup');
          $indicatorFormGroup.find('input').attr('id', key);

          $indicatorFormGroup
            .removeAttr('id')
            .find('label')
            .attr('for', key)
            .text(getInputLabelText(key));
        } else if (typeof indicatorSettings[key] === 'object') {
          $indicatorFormRow.append(selectHtml);
          $indicatorFormGroup = $('#indicatorFormGroup');
          $indicatorFormGroup.find('select').attr('id', key);
          $indicatorFormGroup
            .find('label')
            .attr('for', key)
            .text(getInputLabelText(key));

          for (i = 0; i < indicatorSettings[key].length; i++) {
            $option = $('<option></option>');
            $option.val(indicatorSettings[key][i].toLowerCase());
            $option.text(indicatorSettings[key][i]);
            $indicatorFormGroup.find('select').append($option);
          }

          $indicatorFormGroup.removeAttr('id');
        }
      }
    }

    // col class to form el
    setColClass($indicatorForm);
    // indicator overview text
    if ($indicatorForm.find($("[class*='col-sm-']")).length == 0) {
      $indicatorForm
        .find($('[class="row"]'))
        .append('<div class="col-xs-12" id="overviewText"></div>');
    } else {
      $indicatorForm
        .find($("[class*='col-sm-']"))
        .last()
        .after('<div class="col-xs-12" id="overviewText"></div>');
    }
    $indicatorForm
      .find('#overviewText')
      .append(
        indicatorsSettings.defaultSettings[indicatorsSettings.name].overview
        .description
      );
  }

  function setDefaultIndicatorSettings() {
    var indicatorSettings =
      indicatorsSettings.defaultSettings[indicatorsSettings.name];

    for (var key in indicatorSettings) {
      if (
        indicatorSettings.hasOwnProperty(key) &&
        key !== 'overview' &&
        key !== 'plotIndex'
      ) {
        $('#' + key).val(indicatorSettings[key]);
      }
    }
  }