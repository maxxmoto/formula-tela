import threading
import webview
from fitness import create_app, seed_data
from fitness import db

flask_app = create_app()

def start_flask():
    with flask_app.app_context():
        seed_data()
    flask_app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

if __name__ == '__main__':
    t = threading.Thread(target=start_flask, daemon=True)
    t.start()
    webview.create_window(
        title='Формула Тела',
        url='http://127.0.0.1:5000',
        width=1200,
        height=800,
        resizable=True,
        fullscreen=False,
        min_size=(900, 600),
        text_select=True,
        confirm_close=True,
    )
    webview.start()
