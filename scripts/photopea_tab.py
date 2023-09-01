
from pathlib import Path

import gradio as gr
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from modules import script_callbacks, shared, scripts, extensions




photopea_ext_dir = Path(scripts.basedir())
photopea_app_dir = photopea_ext_dir.joinpath("photopea")

#opt_section = ("photopea", "редактор")


def on_ui_tabs():
    with gr.Blocks(analytics_enabled=False) as photopea_tab:
        # Check if Controlnet is installed and enabled in settings, so we can show or hide the "Send to Controlnet" buttons.
        controlnet_exists = False
        for extension in extensions.active():
            if "controlnet" in extension.name:
                controlnet_exists = True
                break

        with gr.Row(elem_id="photopeaIframeContainer"):
            pass

        with gr.Row():
            gr.Checkbox(
                label="только активный слой",
                info="вместо отправки сведенного изображения будет отправлен только выбранный в данный момент слой.",
                elem_id="photopea-use-active-layer-only",
            )
            # Controlnet might have more than one model tab (set by the 'control_net_max_models_num' setting).
            try:
                num_controlnet_models = shared.opts.control_net_max_models_num
            except:
                num_controlnet_models = 1

            select_target_index = gr.Dropdown(
                [str(i) for i in range(num_controlnet_models)],
                label="Индекс модели ControlNet",
                value="0",
                interactive=True,
                visible=num_controlnet_models > 1,
            )

        with gr.Row():
            with gr.Column():
                gr.HTML(
                    """<b>расширение Controlnet не найдено!</b> Или <a href="https://github.com/Mikubill/sd-webui-controlnet" target="_blank">установи его</a>, или активируй его в настройках.""",
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
                send_selection_inpaint = gr.Button(value="изо-в-изо по выделенной маске")

        
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
        send_selection_inpaint.click(
            fn=None, _js="sendImageWithMaskSelectionToWebUi")


    return [(photopea_tab, "photopea", "photopea_embed")]


def on_app_started(_: gr.Blocks, app: FastAPI) -> None:
    # Create a static app from the photopea app directory
    photopea_app = StaticFiles(
        directory=photopea_app_dir,
        html=True,
    )
    # Mount it at /photopea
    app.mount(path="/photopea", app=photopea_app, name="photopea")



# register callbacks

# when the UI is built, we'll add the options and (if update was successful) the tab
script_callbacks.on_ui_tabs(on_ui_tabs)

# then when the app is started, we'll mount the static webapp at /photopea
script_callbacks.on_app_started(on_app_started)
