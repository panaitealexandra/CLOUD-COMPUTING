from flask import Flask, render_template, request, redirect, session, url_for
from datetime import datetime
from identity.flask import Auth
import os
import app_config

app = Flask(__name__)
app.config.from_object(app_config)
auth = Auth(
	app,
	authority=os.getenv("AUTHORITY"),
	oidc_authority=os.getenv("OIDC_AUTHORITY"),
	client_id=os.getenv("CLIENT_ID"),
	client_credential=os.getenv("CLIENT_SECRET"),
	redirect_uri=os.getenv("REDIRECT_URI"),
	b2c_tenant_name=os.getenv('B2C_TENANT_NAME'),
	b2c_signup_signin_user_flow=os.getenv('SIGNUPSIGNIN_USER_FLOW'),
	b2c_edit_profile_user_flow=os.getenv('EDITPROFILE_USER_FLOW'),
	b2c_reset_password_user_flow=os.getenv('RESETPASSWORD_USER_FLOW'),
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Simulate DB
users = {"test": "password"}
tasks = []

@app.route("/")
@auth.login_required
def home(*, context):
	return render_template(
		"tasks.html",
		user=context['user'],
		edit_profile_url=auth.get_edit_profile_url(),
		title="v goofy title",
		tasks=tasks,
	)

# @app.route("/login", methods=["GET", "POST"])
# def login():
# 	if request.method == "POST":
# 		username = request.form["username"]
# 		password = request.form["password"]
# 		if users.get(username) == password:
# 			session["username"] = username
# 			return redirect(url_for("home"))
# 		return "Invalid credentials"
# 	return render_template("login.html")

# @app.route("/register", methods=["GET", "POST"])
# def register():
# 	if request.method == "POST":
# 		username = request.form["username"]
# 		password = request.form["password"]
# 		# repeat_password = request.form["repeat_password"]
# 		users[username] = password
# 		return redirect(url_for("login"))
# 	return render_template("register.html")

# @app.route("/logout")
# def logout():
# 	session.pop("username", None)
# 	return redirect(url_for("login"))

@app.route("/add", methods=["GET", "POST"])
def add_task():
	if request.method == "POST":
		title = request.form["title"]
		file = request.files["file"]
		filename = file.filename
		filepath = os.path.join(UPLOAD_FOLDER, filename)
		file.save(filepath)
		tasks.append({
			"title": title,
			"user": session["username"],
			"file": filename,
			"created_at": datetime.now(),
			"archived": False
		})
		return redirect(url_for("home"))
	return render_template("task_form.html", task=None)

@app.route("/archive_old_tasks")
def archive_old_tasks():
	now = datetime.now()
	for task in tasks:
		if not task["archived"] and (now - task["created_at"]).days >= 7:
			task["archived"] = True
	return "Archived old tasks"

if __name__ == "__main__":
	app.run(port=3000, debug=True)
