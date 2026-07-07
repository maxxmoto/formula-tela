from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user
from fitness import db
from fitness.models import CommunityMessage
from datetime import datetime

community = Blueprint('community', __name__, url_prefix='/community')


@community.route('/')
@login_required
def index():
    profile = current_user.profile
    goal = profile.goal_type if profile else 'maintain'
    weight = profile.current_weight if profile else 70

    weight_range = f"{int(weight // 10 * 10)}-{int(weight // 10 * 10 + 10)}"
    room = f"{goal}_{weight_range}"

    messages = CommunityMessage.query.filter_by(room=room, is_sos=False).order_by(
        CommunityMessage.created_at.desc()
    ).limit(50).all()

    return render_template('community/index.html',
                           messages=messages,
                           room=room)


@community.route('/api/messages')
@login_required
def api_messages():
    profile = current_user.profile
    goal = profile.goal_type if profile else 'maintain'
    weight = profile.current_weight if profile else 70
    weight_range = f"{int(weight // 10 * 10)}-{int(weight // 10 * 10 + 10)}"
    room = f"{goal}_{weight_range}"

    messages = CommunityMessage.query.filter_by(room=room, is_sos=False).order_by(
        CommunityMessage.created_at.desc()
    ).limit(50).all()

    return jsonify([{
        'username': m.user.username,
        'message': m.message,
        'time': m.created_at.strftime('%H:%M')
    } for m in messages])


@community.route('/send', methods=['POST'])
@login_required
def send_message():
    data = request.json
    profile = current_user.profile
    goal = profile.goal_type if profile else 'maintain'
    weight = profile.current_weight if profile else 70
    weight_range = f"{int(weight // 10 * 10)}-{int(weight // 10 * 10 + 10)}"
    room = f"{goal}_{weight_range}"

    msg = CommunityMessage(
        user_id=current_user.id,
        room=room,
        message=data.get('message', ''),
        is_sos=data.get('is_sos', False)
    )
    db.session.add(msg)
    db.session.commit()

    return jsonify({'success': True})


@community.route('/sos')
@login_required
def sos():
    return render_template('community/sos.html')
