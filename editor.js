$(function () {
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

  // Attachments filter
  $('#sidebar .attachments-filter input[type="search"]').on('change keyup', function (e) {
    filterAttachments(this.value);
  });
  // Attachment delete
  $('#sidebar .attachments-list a.delete').on('click', function (e) {
    console.warn("Delete needs to be implemented.");
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
  // TODO add epiceditor
  try {
    let id = window.location.hash.replace('#', '');
    let elem = document.querySelector('a[data-url="' + id + '"]');
    elem.click();
    treeLeafExpand(elem);
  } catch (ex) { };

  // Drop files to upload
  {
    function updateView() {
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
              updateView();
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