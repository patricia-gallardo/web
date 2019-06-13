/*global jQuery,cyberDojo*/
'use strict';
var cyberDojo = (function(cd, $) {

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Filenames
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  let theCurrentFilename = '';
  let theLastNonOutputFilename = '';
  let theLastOutputFilename = 'stdout';

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Load a named file
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.loadFile = (filename) => {
    fileDiv(cd.currentFilename()).hide();
    fileDiv(filename).show();

    selectFileInFileList(filename);
    cd.focusSyntaxHighlightEditor(filename);

    theCurrentFilename = filename;
    if (cd.isOutputFile(filename)) {
      theLastOutputFilename = filename;
    } else {
      theLastNonOutputFilename = filename;
    }
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.currentFilename = () => theCurrentFilename;

  cd.eachFilename = (f) => cd.filenames().forEach(f);

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.filenames = () => {
    // Gets the kata/edit page filenames. The review/show
    // page/dialog collects filenames in its own way.
    const filenames = [];
    const prefix = 'file_content_for_';
    $(`textarea[id^=${prefix}]`).each(function(_) {
      const id = $(this).attr('id');
      const filename = id.substr(prefix.length, id.length - prefix.length);
      filenames.push(filename);
    });
    return filenames;
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.sortedFilenames = (filenames) => {
    // Controls the order of files in the filename-list
    // Used in two places
    // 1. kata/edit page to help show filename-list
    // 2. review/show page/dialog to help show filename-list
    return [].concat(hiFilenames(filenames), loFilenames(filenames));
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Filename hot-key navigation
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // See app/assets/javascripts/cyber-dojo_codemirror.js
  // See app/views/shared/_hotkeys.html.erb
  // Alt-J ==> loadNextFile()
  // Alt-K ==> loadPreviousFile()
  // Alt-O ==> toggleOutputFile()

  cd.loadNextFile = () => {
    const hi = hiFilenames(cd.filenames());
    const index = $.inArray(cd.currentFilename(), hi);
    if (index === -1) {
      const next = 0;
      cd.loadFile(hi[next]);
    } else {
      const next = (index + 1) % hi.length;
      cd.loadFile(hi[next]);
    }
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.loadPreviousFile = () => {
    const hi = hiFilenames(cd.filenames());
    const index = $.inArray(cd.currentFilename(), hi);
    if (index === 0 || index === -1) {
      const previous = hi.length - 1;
      cd.loadFile(hi[previous]);
    } else {
      const previous = index - 1;
      cd.loadFile(hi[previous]);
    }
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.toggleOutputFile = () => {
    //if (cd.isOutputFile(cd.currentFilename())) {
    //  cd.loadFile(theLastNonOutputFilename);
    //} else {
    //  cd.loadFile(theLastOutputFilename);
    //}
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // new-file, rename-file, delete-file
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // See app/views/kata/_file_new_rename_delete.html.erb
  // See app/views/kata/_files.html.erb
  // See app/views/kata/_run_tests.js.erb

  cd.fileChange = (filename, file) => {
    cd.fileDelete(filename);
    cd.fileCreate(filename, file);
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.fileCreate = (filename, file) => {
    const newFile = makeNewFile(filename, file);
    $('#visible-files-container').append(newFile);
    rebuildFilenameList();
    cd.switchEditorToCodeMirror(filename);
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.fileDelete = (filename) => {
    fileDiv(filename).remove();
    rebuildFilenameList();
    theLastNonOutputFilename = testFilename();
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.fileRename = (oldFilename, newFilename) => {
    // This should restore the caret/cursor/selection
    // but it currently does not. See
    // https://github.com/cyber-dojo/web/issues/51
    const content = fileContent(oldFilename);
    cd.fileDelete(oldFilename);
    cd.fileCreate(newFilename, { content:content });
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Helpers
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.editorRefocus = () => {
    cd.loadFile(cd.currentFilename());
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.loadTestFile = () => {
    cd.loadFile(testFilename());
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.radioEntrySwitch = (previous, current) => {
    // Used in test-page, setup-pages, and history/diff-dialog
    // See app/assets/stylesheets/wide-list-item.scss
    if (previous !== undefined) {
      previous.removeClass('selected');
    }
    current.addClass('selected');
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const testFilename = () => {
    // When starting and in filename-list navigation
    // when the current file is deleted, try to
    // select a test file.
    const filenames = cd.filenames();
    for (let i = 0; i < filenames.length; i++) {
      // split into dir names and filename
      const parts = filenames[i].toLowerCase().split('/');
      // careful to return the whole dirs+filename
      // and with the original case
      const filename = parts[parts.length - 1];
      if (filename.search('test') !== -1) {
        return filenames[i];
      }
      if (filename.search('spec') !== -1) {
        return filenames[i];
      }
    }
    return filenames[0];
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const fileContent = (filename) => {
    cd.saveCodeFromIndividualSyntaxHighlightEditor(filename);
    return jqElement(`file_content_for_${filename}`).val();
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const jqElement = (name) => {
    return $(`[id="${name}"]`);
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const fileDiv = (filename) => {
    return jqElement(`${filename}_div`);
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const makeNewFile = (filename, file) => {
    const div = $('<div>', {
      'class': 'filename_div',
           id: `${filename}_div`
    });
    const text = $('<textarea>', {
      'class': 'file_content',
      'spellcheck': 'false',
      'data-filename': filename,
      name: `file_content[${filename}]`,
      id: `file_content_for_${filename}`
      //wrap: 'off'
    });
    // For some reason, setting wrap cannot be done as per the
    // commented out line above... when you create a new file in
    // FireFox 17.0.1 it still wraps at the textarea width.
    // So instead I do it like this, which works in FireFox?!
    text.attr('wrap', 'off');

    text.val(file['content']);
    div.append(text);

    return div;
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const setRenameAndDeleteButtons = (filename) => {
    const fileOps = $('#file-operations');
    const renameFile = fileOps.find('#rename');
    const deleteFile = fileOps.find('#delete');
    const disable = (node) => node.prop('disabled', true );
    const enable  = (node) => node.prop('disabled', false);

    if (cantBeRenamedOrDeleted(filename)) {
      disable(renameFile);
      disable(deleteFile);
    } else {
      enable(renameFile);
      enable(deleteFile);
    }
  };

  const cantBeRenamedOrDeleted = (filename) => {
    return filename == 'cyber-dojo.sh';
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const rebuildFilenameList = () => {
    const all = cd.filenames();
    const hiFilenameList = $('#hi-filename-list');
    hiFilenameList.empty();
    $.each(hiFilenames(all), (_, filename) => {
      hiFilenameList.append(makeFileListEntry(filename));
    });
    const loFilenameList = $('#lo-filename-list');
    loFilenameList.empty();
    $.each(loFilenames(all), (_, filename) => {
      loFilenameList.append(makeFileListEntry(filename));
    });
  };

  const makeFileListEntry = (filename) => {
    const div = $('<div>', {
      'class': 'filename',
           id: `radio_${filename}`,
         text: filename
    });
    if (cd.inArray(filename, cd.highlightFilenames())) {
      div.addClass('highlight');
    }
    div.click(() => { cd.loadFile(filename); });
    return div;
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const selectFileInFileList = (filename) => {
    // Can't do $('radio_' + filename) because filename
    // could contain characters that aren't strictly legal
    // characters in a dom node id so I do this instead...
    const node = $(`[id="radio_${filename}"]`);
    const previousFilename = cd.currentFilename();
    const previous = $(`[id="radio_${previousFilename}"]`);
    cd.radioEntrySwitch(previous, node);
    setRenameAndDeleteButtons(filename);
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const hiFilenames = (filenames) => {
    // Controls which filenames appear at the
    // top of the filename-list, above 'output'
    // Used in three places.
    // 1. kata/edit page to help show filename list
    // 2. kata/edit page in alt-j alt-k hotkeys
    // 3. review/show page/dialog to help show filename list
    let hi = [];
    $.each(filenames, (_, filename) => {
      if (isSourceFile(filename)) {
        hi.push(filename);
      }
    });
    hi.sort();
    return hi;
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const loFilenames = (filenames) => {
    // Controls which filenames appear at the
    // bottom of the filename list, below 'output'
    // Used in three places.
    // 1. kata/edit page to help show filename-list
    // 2. kata/edit page in Alt-j Alt-k hotkeys
    // 3. review/show page/dialog to help show filename-list
    let lo = [];
    $.each(filenames, (_, filename) => {
      if (!isSourceFile(filename)) {
        lo.push(filename);
      }
    });
    lo.sort();
    return lo;
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  cd.isOutputFile = (filename) => {
    if (filename === 'stdout') return true;
    if (filename === 'stderr') return true;
    if (filename === 'status') return true;
    return false;
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const isSourceFile = (filename) => {
    let match = false;
    $.each(cd.extensionFilenames(), (_, extension) => {
      // Shell test frameworks (eg shunit2) use .sh as their
      // filename extension but we don't want cyber-dojo.sh
      // in the hiFilenames().
      if (filename.endsWith(extension) && filename !== 'cyber-dojo.sh') {
        match = true;
      }
    });
    return match;
  };

  //- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  return cd;

})(cyberDojo || {}, jQuery);
