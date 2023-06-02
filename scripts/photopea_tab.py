import gradio as gr
from modules import script_callbacks
from modules.shared import opts
from modules import extensions

# Handy constants
PHOTOPEA_MAIN_URL = "https://photopea.com/?p={%22environment%22:{%22fcolor%22:%220xFFFFFF%22,%22bcolor%22:%220x000000%22,%22theme%22:2,%22lang%22:%22ru%22,%22intro%22:false,%22menus%22:[[1,1,1,[0,1,1,1],0,1,1,0,1,1,1,0,1,1,0],1,1,1,1,1,1,1,[0,0,0,1,1]]}}"
PHOTOPEA_IFRAME_ID = "webui-photopea-iframe"
PHOTOPEA_IFRAME_WIDTH = "100%"
PHOTOPEA_IFRAME_LOADED_EVENT = "onPhotopeaLoaded"


# Adds the "Photopea" tab to the WebUI
def on_ui_tabs():
    with gr.Blocks(analytics_enabled=False) as photopea_tab:
        # Check if Controlnet is installed and enabled in settings, so we can show or hide the "Send to Controlnet" buttons.
        controlnet_exists = False
        for extension in extensions.active():
            if "controlnet" in extension.name:
                controlnet_exists = True
                break
        with gr.Row():
            gr.HTML(
                """<div id="ph_overlay"></div>"""
                """<div id="ph_hidead"></div>"""
            )
        with gr.Row():
            # Add an iframe with Photopea directly in the tab.
            gr.HTML(
                f"""<iframe id="{PHOTOPEA_IFRAME_ID}" 
                src = "{PHOTOPEA_MAIN_URL}{get_photopea_url_params()}" 
                width = "{PHOTOPEA_IFRAME_WIDTH}" 
                onload = "{PHOTOPEA_IFRAME_LOADED_EVENT}(this)">"""
            )
        with gr.Row():
            gr.Checkbox(
                label="только активный слой",
                info="отправить только текущий слой, а не все композитное изображение",
                elem_id="photopea-use-active-layer-only",
            )
            # Controlnet might have more than one model tab (set by the 'control_net_max_models_num' setting).
            try:
                num_controlnet_models = opts.control_net_max_models_num
            except:
                num_controlnet_models = 1

            select_target_index = gr.Dropdown(
                [str(i) for i in range(num_controlnet_models)],
                label="модели ControlNet",
                value="0",
                interactive=True,
                visible=num_controlnet_models > 1,
            )

           

        with gr.Row():
            with gr.Column():
                gr.HTML(
                    """<b>дополнение Controlnet не установлено.</b>""",
                    visible=not controlnet_exists,
                )
                send_t2i_cn = gr.Button(
                    value="отправить в текст-в-изо ControlNet", visible=controlnet_exists
                )
                send_extras = gr.Button(value="отправить в апскейл/исправление лиц")

            with gr.Column():
                send_i2i = gr.Button(value="отправить в изо-в-изо")
                send_i2i_cn = gr.Button(
                    value="отправить в изо-в-изо ControlNet", visible=controlnet_exists
                )
            with gr.Column():
                send_selection_inpaint = gr.Button(value="зарисовать выделеное")


        # The getAndSendImageToWebUITab in photopea-bindings.js takes the following parameters:
        #  webUiTab: the name of the tab. Used to find the gallery via DOM queries.
        #  sendToControlnet: if true, tries to send it to a specific ControlNet widget, otherwise, sends to the native WebUI widget.
        #  controlnetModelIndex: the index of the desired controlnet model tab.
        send_t2i_cn.click(
            None,
            select_target_index,
            None,
            _js="(i) => {getAndSendImageToWebUITab('txt2img', true, i)}",
        )
        send_extras.click(
            None,
            select_target_index,
            None,
            _js="(i) => {getAndSendImageToWebUITab('extras', false, i)}",
        )
        send_i2i.click(
            None,
            select_target_index,
            None,
            _js="(i) => {getAndSendImageToWebUITab('img2img', false, i)}",
        )
        send_i2i_cn.click(
            None,
            select_target_index,
            None,
            _js="(i) => {getAndSendImageToWebUITab('img2img', true, i)}",
        )
        send_selection_inpaint.click(fn=None, _js="sendImageWithMaskSelectionToWebUi")

    return [(photopea_tab, "редактор", "photopea_embed")]


# Initialize Photopea with an empty, 512x512 white image. It's baked as a base64 string with URI encoding.
def get_photopea_url_params():
    return "#%7B%22resources%22:%5B%22data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIAAQMAAADOtka5AAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAANQTFRF////p8QbyAAAADZJREFUeJztwQEBAAAAgiD/r25IQAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfBuCAAAB0niJ8AAAAABJRU5ErkJggg==%22%5D%7D"


# Actually hooks up the tab to the WebUI tabs.
script_callbacks.on_ui_tabs(on_ui_tabs)
