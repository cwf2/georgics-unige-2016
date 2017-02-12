// default parameters

var defaultElementSeparator = ",";
var intertexts;

// functions

function standardizeLoc(loc, sep) {
  // standardize field separator in locus tags
  
  sep = typeof(sep) !== "undefined" ? sep : defaultElementSeparator;
  return (loc.replace(/[\.,_]/g, sep));
}

function textunit2row(textunit, labelid, metatag) { 
  // turn a textunit into a table row
  
  labelid = typeof(labelid) !== "undefined" ? labelid : false;
  metatag = typeof(metatag) !== "undefined" ? metatag : false;

  var newVerse = $("<tr />");
  if (labelid === true) {     
    newVerse.attr("id", "verse_id_" + textunit.id);   
  }
  newVerse.append(     
    $("<td />").addClass("verse_loc").text(
      standardizeLoc(textunit.loc)
    )
  ).append(
    $("<td />").addClass("verse_text").text(
      textunit.verse
    )
  );
  if (metatag === true) {
    newVerse.append(
      $("<td />").addClass("verse_meta")
    );
  }

  return(newVerse); 
} 


function loadTessPassage(dest, name, first, last, labelid, metatag, callback) {
  // get passage from server, display it in dest, invoke callback

  labelid = typeof(labelid) !== "undefined" ? labelid : false;
  metatag = typeof(metatag) !== "undefined" ? metatag : false;
    
  var querystring = ["/query", name, "loc", 
    standardizeLoc(first, "."), standardizeLoc(last, ".")].join("/");
  
  $.getJSON(querystring, {}, function(data) {
    dest.html("");
    
    dest.append(data.response.map(function(textunit) {
      return(textunit2row(textunit, labelid, metatag));
    }));
    
    if (callback && typeof(callback) == "function") {
      callback();
    }
  });
}


function initTargetText(passage, callback) {
  // parse the user-entered passage, load it in text-target
  
  var field = passage.split(" ")
  
  if (field.length > 2) {
    loadTessPassage(
      dest=$("#text-target"), 
      name=field[0], first=field[1], last=field[2],
      labelid=true,
      metatag=true,
      callback=function(){
        $("#title").text([
          field[0],
          field.slice(1,3).join(" - ")
        ].join(" "))
        showBadges()
      }
    )
  }
}


function gdataToItext(gdata) {
  return ({
    "source": (gdata.gsx$source.$t ||
      ""),
    "source_start": (gdata.gsx$sourcestart.$t || ""),
    "source_stop": (gdata.gsx$sourcestop.$t || ""),
    "target": (gdata.gsx$target.$t || ""),
    "target_start": (gdata.gsx$targetstart.$t || ""),
    "target_stop": (gdata.gsx$targetstop.$t || ""),
    "target_text": (gdata.gsx$targettext.$t ||
      ""),
    "added_by": (gdata.gsx$addedby.$t || ""),
    "auth": (gdata.gsx$auth.$t ||
      ""),
    "note": (gdata.gsx$note.$t || "")
  });
}

function getGsheetData(gdocsKey, worksheetId, callback) { 
  // load intertexts from Google Sheets
  
  worksheetId = typeof(worksheetId) !== "undefined" ? worksheetId : 1;

  var url = "https://spreadsheets.google.com/feeds/list/" + 
    gdocsKey + "/" + worksheetId + "/public/full";

  $.getJSON(url, {"alt": "json"}, function(data) {
    intertexts = data.feed.entry.map(gdataToItext);

    if (callback && typeof(callback) == "function") {
      callback();
    }
  });
}

function displaySingleItext(itext) {
  // create a little table giving details of a single itext

  var itextDetails = $("<div />").addClass("itext");

  // make loci look intuitive 
  var targetLoc = standardizeLoc(itext.target_start);
  if (itext.target_start != itext.target_stop) {
    targetLoc = [targetLoc, standardizeLoc(itext.target_stop)].join(" - ")
  }

  var sourceLoc = standardizeLoc(itext.source_start);
  if (itext.source_start != itext.source_stop) {
    sourceLoc = [sourceLoc, standardizeLoc(itext.source_stop)].join(" - ");
  }
  
  // create the source text container 
  // and start loading the source passage
  var itextSourceText = $("<table />").addClass("itext-source");
  loadTessPassage(itextSourceText,
    name=itext.source, first=itext.source_start, last=itext.source_stop
  );
  
  // build the annotation
  var itextBody = $("<table />"
    ).addClass("itext-details"
    ).append($("<tr />"
      ).append($("<td />"
        ).text("Note")
      ).append($("<td />"
        ).addClass("notes-em").text(itext.note))
    ).append($("<tr />"
      ).append($("<td />"
        ).text("Commentaire")
      ).append($("<td />"
        ).text(itext.auth))
    ).append($("<tr />"
        ).append($("<td />"
          ).text("Saisi par")
        ).append($("<td />"
          ).text(itext.added_by)));
  
  var itextHeader = $("<table />"
    ).addClass("itext-header"
    ).append($("<tr />"
      ).append($("<th />"
        ).text(targetLoc + " " + itext.target_text)
      ).append($("<td />"
        ).text(itext.source + " " + sourceLoc
        ).click(
          function() {itextSourceText.toggle()}
        ).addClass("link")));

  itextDetails.append(
    $("<div />").addClass("container-itext-header"
      ).append(itextHeader)
    ).append($("<div />").addClass("container-itext-source"
      ).append(itextSourceText)
    ).append($("<div />").addClass("container-itext-body"
      ).append(itextBody)
    );

  return (itextDetails);
}

function displayItexts(itextArray) {
  // display a group of intertexts in the "notes" panel

  $("#container-annotations").html("");

  $.each(itextArray, function(i, itext) {
    var newItext = $("<div/>").addClass("container-itext");
    newItext.append(displaySingleItext(itext));
    $("#container-annotations").append(newItext);
  });
}

function locIsSameOrAfter(left, right) {
  // is the first locus equal to or later than the second

  var leftElements = left.split(/[\.,_]/);
  var rightElements = right.split(/[\.,_]/);

  if (leftElements.length != rightElements.length) {
    return (NaN);
  }

  for (var i in leftElements) {
    if (leftElements[i] < rightElements[i]) {
      return (false);
    }
  }

  return (true);
}

function locIsSameOrBefore(left, right) {
  // is the first locus equal to or earlier than the second

  var leftElements = left.split(/[\.,_]/);
  var rightElements = right.split(/[\.,_]/);

  if (leftElements.length != rightElements.length) {
    return (NaN);
  }

  for (var i in leftElements) {
    if (leftElements[i] > rightElements[i]) {
      return (false);
    }
  }

  return (true);
}

function itextsByLoc(loc) { 
  // find all intertexts implicated for a given locus
  
  return (intertexts.filter(function(itext) {
    return (
      locIsSameOrAfter(loc, itext.target_start) && 
      locIsSameOrBefore(loc, itext.target_stop));
  }));
}

function addBadgeThisLine(verse, sources) {

  var loc = verse.getElementsByClassName("verse_loc")[0].textContent;
  var metaCell = verse.getElementsByClassName("verse_meta")[0];

  var theseItexts = itextsByLoc(loc);

  if (typeof(sources !== "undefined")) {
    theseItexts = theseItexts.filter(function(itext) {
      return($.inArray(itext.source, sources) > -1)
    })
  }

  var nItexts = theseItexts.length;

  if (nItexts > 0) {
    var badge = $("<span />").addClass("badge").text(nItexts);
    $(badge).click(function() {
      displayItexts(theseItexts);
      $(".nav-item-selected").removeClass("nav-item-selected")
      $("#btn-show").addClass("nav-item-selected")
      $("#container-toolbox").hide();
      $("#container-annotations").show();      
    });
    $(metaCell).append(badge);
  }
}

function showBadges() {
  var sources = $(".sources-list-checkbox:checked").map(function(){
    return($(this).val())
  });
  
  $("#container-annotations").html("");
  $(".badge").detach()
  
  if(sources.length > 0) {
    $("#text-target tr").each(function(i, verse) {
      addBadgeThisLine(verse, sources)
    });
  }
}


function tally(arr) {
  var tally = {};
  
  arr.map(function(el) {
    if (typeof(tally[el]) === "undefined") {
      tally[el] = 1;
    } else {
      tally[el] += 1; 
    }
  })

  return tally;
}

function populateSourcesList() {
  // group intertexts by source and populate the order-by checkboxes
  
  var tallyBySource = tally(
    intertexts.map(function(i){return i.source}).sort()
  );
  
  $("#sources-list tbody").html("");
  $("#sources-list tbody").append(
    $("<tr />").attr("id", "sources-list-row-all"
      ).append($("<td />"
        ).append($("<input />"
          ).attr("type", "checkbox"
          ).attr("id", "sources-list-checkbox-all"
          ).prop("checked", true))
      ).append($("<td />").text("tous")
      ).append($("<td />").text(intertexts.length))
  );
  
  $("#sources-list-checkbox-all").change(function() {
    $("#sources-list input").prop("checked", $(this).prop("checked"));
    showBadges();
  })
  
  for (var source in tallyBySource) {
    if (tallyBySource.hasOwnProperty(source)) {

      var tblRow = $(
        "<tr />"
          ).append($("<td />"
            ).append($("<input />"
              ).attr("type", "checkbox"
              ).attr("value", source
              ).addClass("sources-list-checkbox"
              ).prop("checked", true))
          ).append($("<td />").text(source)
          ).append($("<td />").text(tallyBySource[source]));
      
      $("#sources-list tbody").append(tblRow);
    }
  }
  
  $(".sources-list-checkbox").change(showBadges)
}

function initPage(passage, gdocsKey, worksheetId) { 
  // load all components of the page

  getGsheetData(gdocsKey, worksheetId, function() {
    populateSourcesList();
    $("#btn-show").click(function(){
      $(".nav-item-selected").removeClass("nav-item-selected")
      $("#btn-show").addClass("nav-item-selected")
      $("#container-toolbox").hide();
      $("#container-annotations").show();
    })
    $("#btn-sort").click(function(){
      $(".nav-item-selected").removeClass("nav-item-selected")
      $("#btn-sort").addClass("nav-item-selected")
      $("#container-annotations").hide();
      $("#container-toolbox").show();
    })
    initTargetText(passage);
  });
}


