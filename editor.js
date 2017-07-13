var unsaved = false;
var currentFile = null;
$(function () {

  // New
  $('.controls .new').on('click', function (e) {
    e.preventDefault();
    var title = prompt('Enter page title; optionally with path, example: sub folder/my page', '');
    if (title != null && title != '') {
      $.post('{{ pico_edit_url }}/new', { title: title }, function (data) {
        console.log(data)
        if (data.error) {
          alert(data.error);
        }
        else {
          $('.nav .post').removeClass('open');
          currentFile = data.file;
          PicoEditEditor.onNewPost && PicoEditEditor.onNewPost(data.file, data);
          unsaved = false;
          document.title = document.title.replace(' *', '');
          $('.nav').prepend('<li><a href="#" data-url="' + data.file + '" class="post open"><span class="icon-file-text2 marg-r5" aria-hidden="true"></span>/' + data.file + '</a><a href="' + data.url + '" target="_blank" class="view" title="View"><span class="icon icon-eye marg-r5" aria-hidden="true"></span></a><a href="#" data-url="' + data.file + '" class="delete" title="Delete"><span class="icon icon-bin marg-r5" aria-hidden="true"></span></a></li>')
        }
      }, 'json');
    }
  });

  // Open post
  $('.nav,.nav0').on('click', '.post', function (e) {
    e.preventDefault();
    if (unsaved && !confirm('You have unsaved changes. Are you sure you want to leave this post?')) return false;
    $('.nav .post,.nav0 .post').removeClass('open');
    $(this).addClass('open');

    var fileUrl = $(this).attr('data-url');
    window.location.href = '#' + fileUrl;
    openPost(fileUrl);
  });

  let openPost = fileUrl => {
    $.post('{{ pico_edit_url }}/open', { file: fileUrl }, function (data) {
      PicoEditEditor.onOpenPost && PicoEditEditor.onOpenPost(fileUrl, data);
      unsaved = false;
      currentFile = fileUrl;
      document.title = document.title.replace(' *', '');
    });
  }

  // btn - Delete
  $('.nav').on('click', '.delete', function (e) {
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this file?')) return false;
    $('.nav .post').removeClass('open');

    var li = $(this).parents('li');
    var fileUrl = $(this).attr('data-url');
    $.post('{{ pico_edit_url }}/delete', { file: fileUrl }, function (data) {
      li.remove();
      PicoEditEditor.onDeletePost(fileUrl, data);
      unsaved = false;
      document.title = document.title.replace(' *', '');
      document.location.hash = '';
    });
  });

  // btn - Save
  $('.controls').on('click', '.savebutton', function (e) {
    e.preventDefault();
    save();
  });

  // btn - Clear cache
  $('.controls').on('click', '.clearcachebutton', function (e) {
    e.preventDefault();
    $('#saving').text('Clearing...').addClass('active');
    $.post('{{ pico_edit_url }}/clearcache', {}, function (data) {
      $('#saving').text('Cache cleared');
      setTimeout(function () {
        $('#saving').removeClass('active');
      }, 1000);
    });
  });

  // btn - Commit
  $('.controls').on('click', '.commitbutton', function (e) {
    e.preventDefault();
    open_popup();
    $('.popupcontent').load('{{ pico_edit_url }}/commit');
  });

  // btn - Push / Pull
  $('.controls').on('click', '.pushpullbutton', function (e) {
    e.preventDefault();
    open_popup();
    $('.popupcontent').load('{{ pico_edit_url }}/pushpull');
  });

  $('#popup').on('click', '.closegadget', function (e) {
    e.preventDefault();
    close_popup();
  });

  $('#cover').on('click', function (e) {
    e.preventDefault();
    close_popup();
  });

  // btn - Apply pattern
  $('.pattern-apply').on('click', function (e) {
    e.preventDefault();
    if (unsaved && !confirm('You have unsaved changes. Are you sure you want to leave this post?')) return false;
    var fileUrl = $('#pattern-select').val();
    if (!fileUrl) return;
    $.post('{{ pico_edit_url }}/open', { file: fileUrl }, function (data) {
      let currentValue = PicoEditEditor.value();
      let titleRow = currentValue.match(/title\s*.*/i);
      titleRow = (titleRow && titleRow[0] || '');
      let dateRow = currentValue.match(/date\s*.*/i);
      dateRow = (dateRow && dateRow[0] || '');
      let content = data.replace(/ispattern:\s*true\s*/i, '').replace(/title\s*.*/i, titleRow).replace(/date\s.*/i, dateRow);
      PicoEditEditor.value(content)
      unsaved = false;
    });
  });

  // shortcuts
  $(window).on('keydown', function (e) {
    var keyCode = e.which || e.keyCode
    switch (keyCode) {
      case 83: // s
        if (e.ctrlKey) {
          e.preventDefault();
          save();
        }
        break;

      default:
        break;
    }
  })

  // Actions
  function save() {
    $('#saving').text('Saving...').addClass('active');
    $.post('{{ pico_edit_url }}/save', { file: currentFile, content: PicoEditEditor.value() }, function (data) {
      $('#saving').text('Saved');
      unsaved = false;
      document.title = document.title.replace(' *', '');
      setTimeout(function () {
        $('#saving').removeClass('active');
      }, 1000);
    });
  }

  // Attachments filter
  $('#sidebar .attachments-filter input[type="search"]').on('change keyup', function (e) {
    filterAttachments(this.value);
  });
  // Attachment copy
  $('.attachments-list-container').on('click', 'a.copy', function (e) {
    e.preventDefault();
    if (!document.queryCommandSupported('copy')) {
      console.warn('Copy is not supported.')
      return;
    }
    let fileUrl = $(this).data('atta-path');
    let div = document.createElement('div');
    div.style.width = '1px'; div.style.height = '1px'; div.style.overflow = 'hidden';
    div.appendChild(document.createTextNode(fileUrl))
    document.body.appendChild(div);
    let range = document.createRange(); range.selectNodeContents(div);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    if (!document.execCommand('copy'))
      console.warn('Copy command failed.');
    else {
      $('#saving').text('Coppied').addClass('active');
      setTimeout(function () {
        $('#saving').removeClass('active');
      }, 1000);
    }
    document.body.removeChild(div);
  });
  // Attachment delete
  $('.attachments-list-container').on('click', 'a.delete', function (e) {
    e.preventDefault();
    let file = this.dataset.attaUrl;
    let formData = new FormData();
    formData.append('file', file);

    let xhr = new XMLHttpRequest();
    xhr.open('POST', '{{ pico_edit_url }}/attachment_delete');
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          let result = JSON.parse(xhr.response);
          if (result.success) {
            updateAttachmentView();
          } else {
            console.info(result.error);
          }
        } catch (ex) {
          console.info('Delete failed');
        }
      } else {
        console.info('Delete failed');
      }
    };
    xhr.send(formData);
  });

  // Collapsible tree
  function treeNodeToggle(ul) {
    let state = ul.dataset.nodeState === 'open';
    if (state) {
      treeNodeCollapse(ul);
    } else {
      treeNodeExpand(ul);
    }
  }
  function treeNodeCollapse(ul) {
    ul.dataset.nodeState = 'closed';
    ul.style.maxHeight = '0px';
  }
  function treeNodeExpand(ul) {
    ul.dataset.nodeState = 'open';
    ul.style.maxHeight = ul.dataset.maxHeight;
  }
  function treeLeafExpand(elem) {
    if (elem && elem.classList.contains('tree')) {
      treeNodeExpand(elem);
    }
    treeLeafExpand(elem.parentElement);
  }
  document.querySelectorAll(".pages-all-expand").forEach((button) => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      document.querySelectorAll("ul.tree").forEach((ul) => {
        treeNodeExpand(ul);
      })
    })
  })
  document.querySelectorAll(".pages-all-collapse").forEach((button) => {
    button.addEventListener('click', (ev) => {
      ev.preventDefault();
      document.querySelectorAll("ul.tree").forEach((ul) => {
        let liDir = ul.previousElementSibling;
        if (liDir && liDir.nodeName.toLowerCase() === 'li')
          treeNodeCollapse(ul);
      })
    })
  })
  document.querySelectorAll("ul.tree").forEach((ul) => {
    let liDir = ul.previousElementSibling;
    ul.style.maxHeight = ul.offsetHeight + 'px';
    ul.dataset.maxHeight = ul.style.maxHeight;
    if (liDir && liDir.nodeName.toLowerCase() === 'li') {
      ul.dataset.nodeState = 'open';
      treeNodeToggle(ul);
      liDir.addEventListener('click', (ev) => {
        ev.preventDefault();
        treeNodeToggle(ul);
      })
    }
  })

  // Edit hashed file
  {
    try {
      let id = window.location.hash.replace('#', '');
      !id && (id = 'index');
      let elem = document.querySelector('a[data-url="' + id + '"]');
      elem.click();
      treeLeafExpand(elem);
    } catch (ex) { };
  }

  // Drop files to upload
  {
    function updateAttachmentView() {
      let xhr = new XMLHttpRequest();
      xhr.open('GET', '{{ pico_edit_url }}/get_attachments_html');
      xhr.onload = () => {
        if (xhr.status === 200) {
          let container = document.querySelector(".attachments-list-container");
          container.innerHTML = xhr.response;
          filterAttachments(document.querySelector('#sidebar .attachments-filter input[type="search"]').value);
        }
      }
      xhr.send();
    }
    function handleFileSelect(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      console.log(ev);
      let files = ev.dataTransfer.files;
      let formData = new FormData();
      for (let i = 0, file; file = files[i]; i++) {
        let fileType = file.type;
        formData.append('file[' + i + ']', file, file.name);
      }
      // console.debug(files)
      // console.debug(formData)

      var xhr = new XMLHttpRequest();
      xhr.open('POST', '{{ pico_edit_url }}/attachments_upload');
      xhr.onload = function () {
        if (xhr.status === 200) {
          // console.log('all done: ' + xhr.status, this);
          try {
            let result = JSON.parse(xhr.response);
            if (result.length) {
              updateAttachmentView();
            }
          } catch (ex) {
            console.info('Upload failed');
          }
        } else {
          console.info('Upload failed');
        }
      };
      xhr.send(formData);
    }
    function handleDragOver(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'copy';
    }
    var dropZone = document.querySelector('.attachments-list-container');
    dropZone.addEventListener('dragover', handleDragOver, false);
    dropZone.addEventListener('drop', handleFileSelect, false);
  }

});

function open_popup() {
  $('#cover').show();
  $('#popup').show();
  $(document).on('keyup.popup', function (e) {
    if (e.keyCode == 27) {
      close_popup();
    }
  });
}

function close_popup() {
  $('#cover').hide();
  $('#popup').hide();
  $('.popupcontent').empty();
  $(document).unbind('keyup.popup');
}

$.getJSON("{{ pico_edit_url }}/git", function (data) {
  if (data.have_repo) {
    $('.commitbutton').show();
  }
  if (data.remotes.length) {
    $('.pushpullbutton').show();
  }
});

function filterAttachments(key) {
  $('#sidebar .attachments-list li').show();
  document.querySelectorAll('#sidebar .attachments-list li').forEach(function (elem) {
    var regex = new RegExp(key, 'ig');
    if (!elem.dataset.filterBy.match(regex)) {
      $(elem).hide();
    }
  });
}