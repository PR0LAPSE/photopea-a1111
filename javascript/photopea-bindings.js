var photopeaWindow = null;
var photopeaIframe = null;

const PHOTOPEA_MAIN_URL = "/photopea";
const PHOTOPEA_IFRAME_ID = "webui-photopea-iframe";
const PHOTOPEA_IFRAME_HEIGHT = 768;
const PHOTOPEA_IFRAME_WIDTH = "100%";

function loadPhotopea() {
  // добавление iframe
  if (gradioApp().getElementById(PHOTOPEA_IFRAME_ID) !== null) {
    return;
  }

  const reload_link = document.createElement("span");
  reload_link.id = "reload_photopea_iframe";
  reload_link.textContent = 'перезагрузить айфрейм, если не видно меню';
  reload_link.style.cssText = `position: absolute; top: 6px; left: 740px; cursor: pointer;`;

  const iframe = document.createElement("iframe");
  iframe.id = PHOTOPEA_IFRAME_ID;
  iframe.src =
    PHOTOPEA_MAIN_URL +
    "#%7B%22resources%22:%5B%22data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIAAQMAAADOtka5AAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAANQTFRF////p8QbyAAAADZJREFUeJztwQEBAAAAgiD/r25IQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfBuCAAAB0niJ8AAAAABJRU5ErkJggg==%22%5D%7D";
  iframe.width = PHOTOPEA_IFRAME_WIDTH;
  iframe.height = PHOTOPEA_IFRAME_HEIGHT;
  iframe.style.height = "calca(100vh - 180px)"
  iframe.onload = onPhotopeaLoaded;


  document.querySelector("#photopeaIframeContainer").appendChild(iframe);
  document.querySelector("#photopeaIframeContainer").appendChild(reload_link);



  let iframeContainer = document.querySelector("#photopeaIframeContainer");
  let resizer = document.createElement('div');
  resizer.id = 'resizer';
  resizer.style.height = "10px";
  resizer.style.background = "var(--button-secondary-background-fill)";
  resizer.style.cursor = "row-resize";
  resizer.style.position = "relative";
  resizer.style.bottom = "16px";
  resizer.style.fontSize = "9px";
  resizer.style.textAlign = "center";
  resizer.textContent = "схвати и тащи меня для изменения размера";
  iframeContainer.parentNode.insertBefore(resizer, iframeContainer.nextSibling);

  let isResizing = false;
  let currentY;
  let originalHeight;

  function handleMouseDown(e) {
    handleMouseUp(e);
    isResizing = true;
    currentY = e.clientY;
    originalHeight = parseFloat(getComputedStyle(iframe, null).getPropertyValue('height').replace('px', ''));
  }

  function handleMouseMove(e) {
    if (!isResizing) {
      return;
    }
    const offsetY = e.clientY - currentY;
    iframe.style.height = (originalHeight + offsetY) + 'px';
  }
  function handleMouseUp(e) {
    isResizing = false;
  }
  resizer.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  //iframe.addEventListener('mouseleave', handleMouseUp);


  function reloadIframe() {
    const iframe = document.getElementById("webui-photopea-iframe");
    iframe.src = iframe.src;
  }
  reload_link.addEventListener("click", reloadIframe);
  setTimeout(() => {
    reloadIframe();
  }, 7000);

}

// отложенная загрузка iframe после загрузки вебуи
document.addEventListener("DOMContentLoaded", function () {
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.addedNodes && mutation.addedNodes.length > 0) {
        for (var i = 0; i < mutation.addedNodes.length; i++) {
          var node = mutation.addedNodes[i];
          if (node === document.querySelector("#photopeaIframeContainer")) {
            loadPhotopea();
            observer.disconnect();
          }
        }
      }
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

// Called by the iframe set up on photopea-tab.py.
let isPhotopeaLoaded = false;

function onPhotopeaLoaded(e) {
  if (isPhotopeaLoaded) {
    return;
  }
  isPhotopeaLoaded = true;

  const iframe = gradioApp().getElementById("webui-photopea-iframe");
  photopeaWindow = iframe.contentWindow;
  photopeaIframe = iframe;

  // создание кнопок для отправки содержимого галерей в txt2img, img2img и extras
  const buttons = [
    { queryId: "image_buttons_txt2img", gallery: "#txt2img_gallery" },
    { queryId: "image_buttons_img2img", gallery: "#img2img_gallery" },
    { queryId: "image_buttons_extras", gallery: "#extras2img_gallery" }
  ];

  buttons.forEach(button => {
    createSendToPhotopeaButton(button.queryId, button.gallery);
  });
}


// Creates a button in one of the WebUI galleries that will get the currently selected image in the
// gallery.
// `queryId`: the id for the querySelector to search for the specific gallery list of buttons.
// `gallery`: the gallery div itself (cached by WebUI).
function createSendToPhotopeaButton(queryId, gallery) {
  // Проверка на существование кнопки
  const existingButton = gradioApp().querySelector(`#${queryId}_open_in_photopea`);
  if (existingButton) {
    return;
  }

  const templateButton = gradioApp().querySelector(`#${queryId} div.form > button`);
  const newButton = templateButton.cloneNode(true);
  newButton.style.display = "flex";
  newButton.id = `${queryId}_open_in_photopea`;
  newButton.textContent = "\uE20E";
  newButton.classList.add('fa');
  newButton.title = 'открыть изображение в фоторедакторе';
  newButton.addEventListener("click", () => openImageInPhotopea(gallery));
  gradioApp().querySelector(`#${queryId} div.form`).appendChild(newButton);
}


// Switches to the "Photopea" tab by finding and clicking on the DOM button.
function goToPhotopeaTab() {
  // Find Photopea tab button, as we don't know which order it might appear in.
  const allButtons = gradioApp()
    .querySelector("#tabs")
    .querySelectorAll("button");
  // The space after the name seems to be added automatically for some reason, so this is likely
  // flaky across versions. We can't use "contains" because there's also "Send to Photopea"
  // buttons.
  photopeaTabButton = Array.from(allButtons).find(
    (button) => button.textContent === "photopea "
  );
  photopeaTabButton.click();
}

// Navigates the UI to the "Inpaint Upload" tab under the img2img tab.
// Gradio will destroy and recreate parts of the UI when swapping tabs, so we wait for the page to
// be refreshed before trying to find the relevant bits.
function goToImg2ImgInpaintUpload(onFinished) {
  // Start by swapping to the img2img tab.
  switch_to_img2img();
  const img2imgdiv = gradioApp().getElementById("mode_img2img");
  setTimeout(() => {
    waitForWebUiUpdate(img2imgdiv).then(() => {
      const allButtons = img2imgdiv.querySelectorAll("div.tab-nav > button");
      const inpaintButton = Array.from(allButtons).find(
        (button) => button.textContent === "по загруженной маске "
      );

      inpaintButton.click();
    }, 1500);
    onFinished();
  });
}

/* Image transfer functions */

// Returns true if the "Active Layer Only" checkbox is ticked, false otherwise.
function activeLayerOnly() {
  return gradioApp()
    .getElementById("photopea-use-active-layer-only")
    .querySelector("input[type=checkbox]").checked;
}

// Gets the currently selected image in a WebUI gallery and opens it in Photopea.
function openImageInPhotopea(originGallery) {
  var imageSizeMatches = true;
  const outgoingImg = document.querySelector(`${originGallery} div.preview > div.thumbnails > button.selected > img`);
  goToPhotopeaTab();

  // First, check the image size to see if we have matching sizes. If it's bigger, we open it
  // as a new document. Otherwise, we just append it to the current document as a new layer.
  postMessageToPhotopea(getPhotopeaScriptString(getActiveDocumentSize)).then(
    (response) => {
      const activeDocSize = response[0].split(",");
      if (
        outgoingImg.naturalWidth > activeDocSize[0] ||
        outgoingImg.naturalHeight > activeDocSize[1]
      ) {
        imageSizeMatches = false;
      }

      blobTob64(outgoingImg.src, (imageData) => {
        // Actually open the image, passing `imageSizeMatches` into Photopea's "open as new document" parameter.
        postMessageToPhotopea(
          `app.open("${imageData}", null, ${imageSizeMatches});`,
          "*"
        ).then(() => {
          if (imageSizeMatches) {
            postMessageToPhotopea(
              `app.activeDocument.activeLayer.rasterize();`,
              "*"
            );
          } else {
            postMessageToPhotopea(
              `alert("New document created as the image sent is bigger than the active document");`,
              "*"
            );
          }
        });
      });
    }
  );
}

// Requests the image from Photopea, converts the array result into a base64 png, then a blob, then
// actually send it to the WebUI.
function getAndSendImageToWebUITab(
  webUiTab,
  sendToControlnet,
  imageWidgetIndex
) {
  // Photopea only allows exporting the whole image, so in case "Active layer only" is selected in
  // the UI, instead of just requesting the image to be saved, we also make all non-selected
  // layers invisible.
  const saveMessage = activeLayerOnly()
    ? getPhotopeaScriptString(exportSelectedLayerOnly)
    : 'app.activeDocument.saveToOE("png");';

  postMessageToPhotopea(saveMessage).then((resultArray) => {
    // The first index of the payload is an ArrayBuffer of the image. We convert that to
    // base64 string, then to blob, so it can be sent to a specific image widget in WebUI.
    // There's likely a direct ArrayBuffer -> Blob conversion, but we're already using b64
    // as an intermediate format.
    const base64Png = base64ArrayBuffer(resultArray[0]);
    sendImageToWebUi(
      webUiTab,
      sendToControlnet,
      imageWidgetIndex,
      b64toBlob(base64Png, "image/png")
    );
  });
}

// Send image to a specific image widget in a Web UI tab. This basically navigates the DOM graph via
// queries, and magically presses buttons. You web developers sure work some dark magic.
function sendImageToWebUi(
  webUiTab,
  sendToControlNet,
  controlnetModelIndex,
  blob
) {
  const file = new File([blob], "photopea_output.png");

  switch (webUiTab) {
    case "txt2img":
      switch_to_txt2img();
      break;
    case "img2img":
      switch_to_img2img();
      break;
    case "extras":
      switch_to_extras();
      break;
  }

  if (sendToControlNet) {
    // First, select the ControlNet accordion div.
    const tabId =
      webUiTab === "txt2img"
        ? "#txt2img_script_container"
        : "#img2img_script_container";
    const controlNetDiv = gradioApp()
      .querySelector(tabId)
      .querySelector("#controlnet");
    // Check if the ControlNet accordion is open by finding the image editing iFrames.
    setImageOnControlNetInput(controlNetDiv, controlnetModelIndex, file);
  } else {
    // For regular tabs, it's less involved - we can simply set the image on input directly.
    const imageInput = gradioApp()
      .getElementById(`mode_${webUiTab}`)
      .querySelector("input[type='file']");
    setImageOnInput(imageInput, file);
  }
}

// I couldn't figure out a way to inject a mask directly on an image widget. So to have an easy way
// of masking inpainting via selection, we send the image to "Inpaint Upload", and create a mask
// from selection.
function sendImageWithMaskSelectionToWebUi() {
  // Start by verifying if there actually is a selection in the document.
  postMessageToPhotopea(getPhotopeaScriptString(selectionExists)).then(
    (response) => {
      if (response[0] === false) {
        // In case there isn't, do an in-photopea alert (which is less intrusive but more
        // visible).
        postMessageToPhotopea(`alert("No selection in active document!");`);
      } else {
        // Let's start by swapping to the correct tab. This is a bit more involved due to
        // Gradio's reconstruction of disabled UI elements.
        goToImg2ImgInpaintUpload(() => {
          // In case there is a selection, we'll pass a whole script payload to Photopea
          // to create the mask and export it.
          const fullMessage =
            getPhotopeaScriptString(createMaskFromSelection) + // 1. Create the mask
            getPhotopeaScriptString(exportSelectedLayerOnly) + // 2. Function that exports the image
            `app.activeDocument.activeLayer.remove();`; // 3. Removes the temp mask layer

          postMessageToPhotopea(fullMessage).then((resultArray) => {
            // Set the mask.
            const base64Png = base64ArrayBuffer(resultArray[0]);
            const maskInput = gradioApp()
              .getElementById("img_inpaint_mask")
              .querySelector("input");
            const blob = b64toBlob(base64Png, "image/png");
            const file = new File([blob], "photopea_output.png");
            setImageOnInput(maskInput, file);

            // Now go in and get the actual image.
            const saveMessage = activeLayerOnly()
              ? getPhotopeaScriptString(exportSelectedLayerOnly)
              : 'app.activeDocument.saveToOE("png");';

            postMessageToPhotopea(saveMessage).then((resultArray) => {
              const base64Png = base64ArrayBuffer(resultArray[0]);
              const baseImgInput = gradioApp()
                .getElementById("img_inpaint_base")
                .querySelector("input");
              const blob = b64toBlob(base64Png, "image/png");
              const file = new File([blob], "photopea_output.png");
              setImageOnInput(baseImgInput, file);
            });
          });
        });
      }
    }
  );
}

// Navigates to the correct ControlNet model tab, then sets the image.
function setImageOnControlNetInput(controlNetDiv, controlNetModelIndex, file) {
  if (controlNetAccordionIsCollapsed(controlNetDiv)) {
    // The accordion is not open. Find the little icon arrow and click it (yes, if the arrow
    // ever changes, this will break).
    controlNetDiv.querySelector("span.icon").click();
  }
  waitForWebUiUpdate(controlNetDiv).then(() => {
    // When more than one Controlnet model is enabled in the WebUI settings, there will be a
    // series of Controlnet tabs. The one selected in the dropdown will be passed in by the
    // `controlnetModelIndex`.
    const tabs = controlNetDiv.querySelectorAll("div.tab-nav > button");
    if (tabs !== null && tabs.length > 1) {
      tabs[controlNetModelIndex].click();
    }

    imageInput =
      controlNetDiv.querySelectorAll("input[type='file']")[
      controlNetModelIndex
      ];
    setImageOnInput(imageInput, file);
  });
}

// Gradio's image widgets are inputs. To set the image in one, we set the image on the input and
// force it to refresh.
function setImageOnInput(imageInput, file) {
  // Createa a data transfer element to set as the data in the input.
  const dt = new DataTransfer();
  dt.items.add(file);
  const list = dt.files;

  // Actually set the image in the image widget.
  imageInput.files = list;

  // Foce the image widget to update with the new image, after setting its source files.
  const event = new Event("change", {
    bubbles: true,
    composed: true,
  });
  imageInput.dispatchEvent(event);
}

// Transforms a JS function body into a string that can be passed as a message to Photopea.
function getPhotopeaScriptString(func) {
  return func.toString() + `${func.name}();`;
}

// Posts a message and receives back a promise that will eventually return a 2-element array. One of
// them will be Photopea's "done" message, and the other the actual payload.
async function postMessageToPhotopea(message) {
  var request = new Promise(function (resolve, reject) {
    var responses = [];
    var photopeaMessageHandle = function (response) {
      responses.push(response.data);
      // Photopea will first return the resulting data as a message to the parent window, then
      // another message saying "done". When we receive the latter, we fulfill the promise.
      if (response.data == "done") {
        window.removeEventListener("message", photopeaMessageHandle);
        resolve(responses);
      }
    };
    // Add a listener to wait for Photopea's response messages.
    window.addEventListener("message", photopeaMessageHandle);
  });
  // Actually execute the request to Photopea.
  photopeaWindow.postMessage(message, "*");
  return await request;
}

// Returns a promise that will be resolved when the div passed in the parameter is modified.
// This will happen when Gradio reconstructs the UI after, e.g., changing tabs.
async function waitForWebUiUpdate(divToWatch) {
  const promise = new Promise((resolve, reject) => {
    // Options for the observer (which mutations to observe)
    const mutationConfig = { attributes: true, childList: true, subtree: true };
    // Callback for when mutation happened. Will simply invoke the passed `onDivUpdated` and
    // stop observing.
    const onMutationHappened = (mutationList, observer) => {
      observer.disconnect();
      resolve();
    };
    const observer = new MutationObserver(onMutationHappened);
    observer.observe(divToWatch, mutationConfig);
  });

  return await promise;
}

// Gradio keeps changing how their DOM works, so we just use some heuristic here to find out
// which child div is the one that contains the ControlNet image inputs. If that one is not
// displayed, we consider the accordion is closed. Other methods include direct indices, or
// checking if the arrow is tilted 90 degrees on the style, both seemed flakier.
function controlNetAccordionIsCollapsed(controlNetDiv) {
  // Get the immediate children of the ControlNet accordion. One of them will contain the
  // actual image widgets.
  const directDescendents = controlNetDiv.children;
  // All of the image iframes are contained within the same content div, so we can use any.
  const sampleIframe = controlNetDiv.querySelectorAll("iframe")[0];

  for (var i = 0; i < directDescendents.length; i++) {
    if (directDescendents[i].contains(sampleIframe)) {
      return directDescendents[i].style["display"] === "none";
    }
  }
  // As a fallback, to prevent constantly triggering the toggle in case future versions break
  // this heuristic, we just return false.
  return false;
}
