var GENEMAP = GENEMAP || {};

GENEMAP.InfoBox = function () {

  var my = {};

  var target = 'body';
  var setManualLabelMode = $.noop;
  var retrieveGeneFunction = function (chromosomeNumber, geneId){ return null;};
  var onAnnotationSelectFunction = $.noop;

  // close all open popovers
  var closeAllPopovers = function (event) {
    $('.infobox').popover('hide');
  };

  var handleGeneListGeneSelect = function(event) {
    log.trace("HandleGeneListGeneSelect");
    button =$( $(event.target).parents('.btn-genelist-gene-select')[0]);
    geneId = button.context.dataset.geneId;
    chromosomeNumber = button.context.dataset.chromosomeNumber;
    gene = retrieveGeneFunction( chromosomeNumber, geneId );
    if (gene) {
      gene.selected = !gene.selected;
      onAnnotationSelectFunction();
    }
    else {
      log.warn( "Can't find gene to update selected status!") ;
    }
  }

  // generates the HTML content for the Gene popover
  var generateGenePopoverContent = function (id, data) {
    var button = '<span class="btn-infobox-label show-label" ' +
      ' data-feature-id="' + id + '" title ="Show Label"></span>';

    if (data.showLabel === 'show')
    {
      button = '<span class="btn-infobox-label hide-label" data-feature-id="' + id + '" title ="Hide Label"></span>';
    }

    return '<div><a href="' + data.link + '" target="_blank">' + data.label + '</a>' +
             '<br />Chromosome ' + data.chromosome + ' :' +
              data.start + '-' + data.end + button +
              '</div>';
  };

  var generateGenesListPopoverContent = function( genesCollection ) {
    var content =  '<div>'
    for (var i = 0; i < genesCollection.genesList.length; i++) {
      gene = genesCollection.genesList[i];

      //build attributes for span
      cssClass = "btn-genelist-gene-select";
      if ( gene.selected){
        cssClass += " selected";
      }

      id = "feature_"+gene.id

      svgSpan ='<span '
        + ' class= "'+ cssClass + '"'
        + ' id=' + id
        + ' data-gene-id=' + gene.id
        + ' data-chromosome-number=' + gene.chromosome
        + ' >'

      svgSpan += '<svg height="1.5em" width="1.5em" viewBox="0 0 100 100">';
      svgSpan += '<path d="M 10 50 L 90 90 L 90 10 Z" fill = "' + gene.color + '" />';
      svgSpan += '</svg>';
      svgSpan += '</span>'

      //build link
      link = '<a href ="' + gene.link + '" target="_blank">' + gene.label + '</a>';

      content += svgSpan +  " " + gene.midpoint + " " + link + "<br />";
    }
    content += "</div>";
    return content;
  }

  // generates the HTML content for the QTL popover
  var generateQTLPopoverContent = function (data) {

    var content = '<div>';

    for (var i = 0; i < data.labels.length; i++) {
      content += '<a href="' + data.links[i] + '" target="_blank">' + data.labels[i] + '</a><br />';
    }

    content += 'Chromosome ' + data.chromosome + ' :' + data.start + '-' + data.end + '</div>';
    return content;
  };

  // sets the event handlers on the d3 selection to toggle the popover
  var setupPopoverEventHandlers = function (selection) {

    selection.on('mousedown', function () {
      d3.event.preventDefault();
      d3.event.stopPropagation();
      return false;

    }).on('contextmenu', function () {

      $('.infobox').not($(this).children()).popover('hide');
      $(this).children().popover('toggle');

      d3.event.preventDefault();
      d3.event.stopPropagation();
      return false;
    }).on('dblclick', function () {

      d3.event.preventDefault();
      d3.event.stopPropagation();
      return false;
    });
  };

  // atach the infobox listeners to the target, this is so that click + scroll
  // events will close any popovers
  my.attach = function () {
    $(target).off('mousedown mousewheel DOMMouseScroll').on('mousedown mousewheel DOMMouseScroll',  function(event){
      if ($(event.target).hasClass('btn-infobox-label')) { return; }
      if ($(event.target).parents('.btn-genelist-gene-select').length){
        handleGeneListGeneSelect(event);
        return;
      }
      closeAllPopovers(event);
    } );

    $(target).off('click').on('click', '.btn-genelist-gene-select', function (event) {
      log.trace( "Genelist gene select" );
    } );

    $(target).off('click').on('click', '.btn-infobox-label', function (event) {

      setManualLabelMode();
      log.trace('infobox label click  ... ');
      var featureId = $(event.target).data().featureId;

      var feature = d3.select('#' + featureId);
      var data = feature.datum();

      if (data.data) {
        data = data.data;
      }

      var visibility;
      if (data.showLabel === 'show') {
        data.showLabel = 'hide';
        visibility = 'hidden';
      } else {
        data.showLabel = 'show';
        visibility = 'visible';
      }

      feature.select('text').style('visibility', visibility);

      // generate the new HTML
      var content = generateGenePopoverContent(featureId, data);

      // update the html in the popver
      var popover = $('#' + featureId).find('.infobox').data('bs.popover');
      popover.options.content = content;

      // update the html in the currently displayed popover
      $(this).closest('.popover-content').html(content);

      event.preventDefault();
      event.stopPropagation();
      return false;
    });
  };

  // Setup the infobox popovers for the gene annotations, this includes a link and
  // a button to toggle the gene label
  my.setupInfoboxOnSelection = function (selection) {

    selection.selectAll('.infobox').each(function (d) {

      var data = d;

      // check if labella is being used, in which case the data will be moved into the .data property.
      if (data.data) {
        data = data.data;
      }

      var content = "";
      var title = null;

      if (data.type == "gene") {
        var id = $(this).closest('.gene-annotation').attr('id');
        content = generateGenePopoverContent(id, data);
      }
      else if (data.type == "geneslist") {
        content = generateGenesListPopoverContent(data);
        title = "Genes in cluster";

        if (data.genesList.some( function(gene){
          return gene.selected; }) ) {
        }
      }


      // does this element already have a popover?
      var popover = $(this).data('bs.popover');
      if (popover) {
        // update the popover content
        //http://stackoverflow.com/a/13565154
        popover.options.content = content;
        popover.setContent();
        popover.$tip.addClass(popover.options.placement);
      } else {
        // create a new popover
        $(this).popover({
          title: title,
          content: content,
          container: target,
          placement: 'bottom',
          animation: true,
          trigger: 'manual',
          html: true,
        });
      }

    });

    setupPopoverEventHandlers(selection);
  };

  // Setup the QTL infobox popovers, this (possibly) includes multiple
  // links from the combined QTL regions
  my.setupQTLInfoboxOnSelection = function (selection) {

    selection.selectAll('.infobox').each(function (d) {
      var data = d;

      var content = generateQTLPopoverContent(data);

      // does this element already have a popover?
      var popover = $(this).data('bs.popover');
      if (popover) {
        // update the popover content
        popover.options.content = content;
      } else {
        // create a new popover
        $(this).popover({
          title: null,
          content: content,
          container: target,
          placement: 'bottom',
          animation: true,
          trigger: 'manual',
          html: true,
        });
      }

      setupPopoverEventHandlers(selection);
    });
  };

  // specify the 'target' element the popover will exist within
  my.target = function (value) {
    if (!arguments.length) {
      return target;
    }

    target = value;
    return my;
  };

  // Function to set the 'manual' label mode, will be called before
  // each individual label is toggled
  my.setManualLabelMode = function (value) {
    if (!arguments.length) {
      return setManualLabelMode;
    }

    setManualLabelMode = value;
    return my;
  };


  my.onAnnotationSelectFunction = function (value) {
    if (!arguments.length) {
      return onAnnotationSelectFunction;
    }

    onAnnotationSelectFunction = value;
    return my;
  };

  my.retrieveGeneFunction = function (value) {
    if (!arguments.length) {
      return retrieveGeneFunction;
    }

    retrieveGeneFunction = value;
    return my;
  };

  return my;
};
