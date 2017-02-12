// default parameters

var defaultText = "statius.achilleid";
var defaultGdocsKey = "1qUbFVc_soR6eO1aTrs5247yZFg07zoXTPL0_FOzIVpA";
var defaultWorksheetId = 1;
var defaultElementSeparator = ",";
var intertexts;

// functions

function standardizeLoc(loc) {
  return (loc.replace(/[\.,_]/g, defaultElementSeparator));
}


function addVerseRow(verseObj) { 
  // add one verse to the text display

  var newVerse = $("<tr />");
  newVerse.attr("id", "target_verse_" + verseObj.id);
  //newVerse.addClass("list-group-item");

  newVerse.append(
    $("<td />").addClass("verse_loc").text(
      standardizeLoc(verseObj.loc)
    )
  ).append(
    $("<td />").addClass("verse_text").text(
      verseObj.verse
    )
  ).append(
    $("<td />").addClass("verse_meta")
  );

  $("#fulltext").append(newVerse);
}


function getTessDoc(name, callback) { 
  // load a text from local xml file and display it

  $.get("/tesscorpus/" + name + ".xml", {}, function(xmlData) {
    var verseCollection = $(xmlData).find("TextUnit").slice(0, 400);
    $.each(verseCollection,
      function(i, obj) {
        addVerseRow(obj);
      });

    if (callback && typeof(callback) == "function") {
      callback();
    }
  });
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

function getGsheetData(gdocsKey, worksheetId, callback) { // load intertexts
  from Google Sheets

  $.getJSON(
    "https://spreadsheets.google.com/feeds/list/" + gdocsKey + "/" + worksheetId + "/publi
c/full", {
      "alt": "json"
    }, function(data) {
      intertexts =
        data.feed.entry.map(gdataToItext);

      if (callback && typeof(callback) == "function") {
        callback();
      }
    });
}

function displaySingleItext(itext) { // create a little table giving details
  of a single itext

  var itextDetails = $("<table />");

  // make loci look intuitive var targetLoc =
  standardizeLoc(itext.target_start);
  if (itext.target_start !=
    itext.target_stop) {
    targetLoc.concat(" - " +
      standardizeLoc(itext.target_stop))
  }

  var sourceLoc = standardizeLoc(itext.source_start);
  if (itext.source_start != itext.source_stop) {
    sourceLoc.concat(" - " +
      standardizeLoc(itext.source_stop))
  }

  itextDetails.append($("<thead />").append($("<tr />").append($("<th
/>").text(targetLoc + " " + itext.target_text)))).append($("<tbody
/>").append($("<tr />").append($("<td />").text(itext.source + " " +
    sourceLoc))).append($("<tr />").addClass("notes_em").append($("<td
/>").text(itext.note))).append($("<tr />").addClass("notes_em").append(
    $("<td />").html("&mdash; " + itext.added_by))));

  return (itextDetails);
}

function displayItexts(itextArray) { // display a group of intertexts in the
  "notes"
  panel

  $("#div_itexts").html("");

  $.each(itextArray, function(i, itext) {
    var newItext = $("<div
/>").addClass("list-group-item");
    newItext.append(displaySingleItext(itext));

    $("#div_itexts").append(newItext);
  });
}

function locIsSameOrAfter(left, right) { // is the first locus equal to or
  later than the second

  var leftElements = left.split(/[\.,_]/);
  var rightElements =
    right.split(/[\.,_]/);

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

function locIsSameOrBefore(left, right) { // is the first locus equal to or
  earlier than the second

  var leftElements = left.split(/[\.,_]/);
  var rightElements =
    right.split(/[\.,_]/);

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

function itextsByLoc(loc) { // find all intertexts implicated for a given
  locus

  return (intertexts.filter(function(itext) {
    return (locIsSameOrAfter(loc,
      itext.target_start) && locIsSameOrBefore(loc, itext.target_stop));
  }));
}

function addBadgeThisLine(verse) {

  var loc = verse.getElementsByClassName("verse_loc")[0].textContent;
  var
  metaCell = verse.getElementsByClassName("verse_meta")[0];

  var nItexts = itextsByLoc(loc).length;

  if (nItexts > 0) {
    var badge = $("<label />").addClass("label
label-warning").text(nItexts);
    $(badge).click(function() {
      displayItexts(itextsByLoc(loc));
    });

    $(metaCell).append(badge);
  }
}

function showBadges() {
  $("#fulltext tr").each(function(i, verse) {
    addBadgeThisLine(verse)
  });
}

function initPage(text, gdocsKey, worksheetId) { // load all components of
  the page

  getGsheetData(gdocsKey, worksheetId, function() {
    getTessDoc(text,
      function() {
        showBadges();
      });
  });
}

// Document ready actions

$(document).ready(function() {
  initPage(defaultText, defaultGdocsKey,
    defaultWorksheetId);
});
