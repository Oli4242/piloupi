var canvas = null;
var ctx = null;

var r_load = ['bunny', 'bunny_vac', 'bunny_sick', 'house', 'star', 'explain'];
var r = {};

var board_size = {};
var bunnies = {};

var cell_background_colors = ['#888','#555'];

var doctors = {};

var sick_max;

var cell_size = undefined;

var moves_left = undefined;
var moves_total;

var n_well_bunnies;
var n_doctors;
var n_sick_bunnies;

var star_x = 0.5;
var star_y = 0.3;
var star_size = 0.35;
var star_rotation_speed = 0.005;

var framerate = 30;
var update_delay = 1000 / framerate;

var move_time_ms = 160;

var hover = undefined;
var selected = undefined;

var game_outcome = 0;

var alive_left = undefined;

var button_hover = false;

var str = {
	title:'Le Peuple des Piloupis',
	moves_left:'Coups restants :',
	end_of_turn:'Fin de tour',
	end_game:'Fin de partie.',
	alive_left:'Piloupis vivants: %n (%p)',
	restart:'Rejouer',
	end_turn:'Finir le tour',
	dead_count:'Piloupis morts: %n (%p)'
};

function rand_int(n) {
	return Math.floor(Math.random() * n);
}

function is_doctor(x,y) {
	return [x,y] in doctors;
}

function rand_pos() {
	return [rand_int(board_size.x), rand_int(board_size.y)];
}

function rand_unoccupied_pos(dict, other_dict) {
	var p;
	do {
		p = rand_pos();
	} while(p in dict || (other_dict && p in other_dict));
	return p;
}

function place_in_dict(dict, elem, other_dict) {
	var p = rand_unoccupied_pos(dict, other_dict);
	elem.x = p[0];
	elem.y = p[1];
	dict[p] = elem;
}

function add_doctors(n) {
	while(n--)
		place_in_dict(doctors, {}, bunnies);
}

function add_bunnies(n, sick) {
	while(n--) {
		var b = { sick:sick, delay:Math.random() * Math.PI * 2 };
		place_in_dict(bunnies, b, doctors);
	}
}

function update_movables() {
	for(var i in bunnies)
		bunnies[i].movable = bunnies[i].sick <= 0;
}

function neighs(x, y, diag) {
	var l = [{x:x,y:y+1},{x:x-1,y:y},{x:x,y:y-1},{x:x+1,y:y}].concat(
		diag ? [{x:x+1,y:y+1},{x:x+1,y:y-1},{x:x-1,y:y+1},{x:x-1,y:y-1}] : []);
	return l;
}

function o(name, def, min, max) {
	var e = document.getElementById(name + '_');
	var v = parseInt(e.value);
	if(isNaN(v)) v = def;
	if(v < min) v = min;
	if(v > max) v = max;
	e.value = v;
	return v;
}

function parse_options() {
	board_size.x = o('width', 12, 2);
	board_size.y = o('height', 12, 2);
	sick_max = o('stages', 3, 1, 12);
	moves_total = o('moves', 7, 0, 41);

	var cells = board_size.x * board_size.y - 1;

	n_well_bunnies = o('healthy', 30, 1, cells - 1);
	cells -= n_well_bunnies;
	n_sick_bunnies = o('sick', 5, 1, cells);
	cells -= n_sick_bunnies;
	n_doctors = o('doctors', 5, 0, cells);

	cell_size = Math.min((2/3) * canvas.width / board_size.x,
			canvas.height / board_size.y);
}

function move_bunny(b, x, y) {
	if(is_doctor(x, y) && b.sick == 0)
		b.sick = -1;

	b.update = true;
	b.px = b.x;
	b.py = b.y;

	// TODO: FIX THIS ``PROBLEMATIC'' CODE
	b.ix = (x - b.x) * move_time_ms;
	b.iy = (y - b.y) * move_time_ms;
	//s(b.ix + ' ' + b.iy);

	unset_bunny(b.x, b.y);
	bunnies[[x,y]] = b;

	b.x = x;
	b.y = y;

	/*if(b.sick == 0) {
		var ns = neighs(x, y);
		for(var i in ns) {
			var n = bunnies[[ns[i].x,ns[i].y]];
			if(n && n.sick >= 1)
				b.sick = 1;
		}
		b.justsick = true;
	}*/
}

function unset_bunny(x, y) {
	delete bunnies[[x,y]];
}

function get_real_mouse_pos(evt) {
	var rect = canvas.getBoundingClientRect();
	var p = { x:evt.clientX, y:evt.clientY };
	p.x -= rect.left;
	p.y -= rect.top;
	p.x *= canvas.width / canvas.offsetWidth;
	p.y *= canvas.height / canvas.offsetHeight;
	return p;
}

function get_mouse_pos(evt) {
	var p = get_real_mouse_pos(evt);
	p.x = Math.floor(p.x / cell_size);
	p.y = Math.floor(p.y / cell_size);
	return p;
}

function in_board(pos) {
	return pos.x >= 0 && pos.y >= 0 && pos.x < board_size.x &&
		pos.y < board_size.y;
}

function on_button(p) {
	return p.x >= button.x && p.y >= button.y && p.x < button.x + button.w
		&& button.y < button.y + button.h;
}

function mouse_move(evt) {
	var p = get_real_mouse_pos(evt);

	button_hover = on_button(p);

	var p = get_mouse_pos(evt);

	if(!moves_left)
		return;
	if(in_board(p))
		hover = p;
	else
		hover = undefined;
}

function neigh(p1, p2) {
	return (p1.x == p2.x && Math.abs(p1.y - p2.y)) == 1 ||
		(p1.y == p2.y && Math.abs(p1.x - p2.x) == 1);
}

function s(x) { alert(JSON.stringify(x)); }

function rand_int(n) {
	return Math.floor(Math.random() * n);
}

function rand_pick(l) {
	if(l.length == 0)
		return null;
	return l[rand_int(l.length)];
}

function shuffle(l) {
	var n = [];
	l = l.slice();
	while(l.length) {
		var i = rand_int(l.length);
		n.push(l[i]);
		l.splice(i, 1);
	}
	return n;
}

function goable_neighs(x, y, diag) {
	var l = neighs(x, y, diag);
	var p = [];
	for(var i in l)
		if(in_board(l[i]) && !bunny(l[i]))
			p.push(l[i]);
	return p;
}

function end_turn(step) {
	if(step === undefined)
		step = 0;
	moves_left = 0;

	if(step == 0) {
		for(var i in bunnies) {
			var b = bunnies[i];
			if(b.sick >= 1)
				b.sick++;
		}
	} else if(step == 1) {
		for(var i in bunnies) {
			var b = bunnies[i];
			if(b && b.sick == 0) {
				var ns = neighs(b.x, b.y, true);
				for(var j in ns) {
					var nb = bunny(ns[j]);
					if(nb && nb.sick >= 1 && !nb.unmovable) {
						b.sick = 1;
						b.unmovable = true;
						break;
					}
				}
			}
		}

		for(var i in bunnies)
			if(bunnies[i].sick > sick_max)
				delete bunnies[i];

		for(var i in bunnies)
			if(bunnies[i].unmovable)
				delete bunnies[i].unmovable;

		update_alive_left();
	} else if(step == 2) {
		var to_move = new Array();
		for(var i in bunnies) {
			var b = bunnies[i];
			if(!b.unmovable && (b.sick >= 1 || b.movable))
				to_move.push(b);
			else if(b.unmovable)
				delete b.unmovable;
		}

		to_move = shuffle(to_move);

		for(var i in to_move) {
			var choices = goable_neighs(to_move[i].x, to_move[i].y);
			var choice = rand_pick(choices);
			if(!choice)
				continue;
			move_bunny(to_move[i], choice.x, choice.y);
		}
	} else if(step == 3) {
		if(game_ended())
			game_outcome = 1;
		else {
			update_movables();

			moves_left = moves_total;

			selected = undefined;
			hover = undefined;
		}

		check_state();
		return;
	}

	setTimeout(function() { end_turn(step + 1); }, 0.7 * move_time_ms);
}

function game_ended() {
	return victory() || defeat();
}

function check_state() {
	if(moves_left == 0 && !game_outcome)
		setTimeout(end_turn, move_time_ms);
}

function mouse_click(evt) {
	if(button_action() && on_button(get_real_mouse_pos(evt))) {
		button_action()();
		return;
	}

	if(!moves_left)
		return;
	var p = get_mouse_pos(evt);
	if(in_board(p) && !bunny(p) && selected &&
			neigh(p, selected)) {
		var b = bunny(selected);
		b.movable = false;
		move_bunny(b, p.x, p.y);
		moves_left--;
		check_state();
		selected = undefined;
	} else if(selected && same_pos(p, selected)) {
		selected = undefined;
	} else {
		if(in_board(p) && bunny(p) && bunny(p).movable)
			selected = p;
		else
			selected = undefined;
	}
}

var font_size = undefined;
function font(n) {
	font_size = n;
	ctx.font = '' + n + 'px sans';
}

function init() {
	canvas = document.getElementById('canvas');
	ctx = canvas.getContext('2d');

	resize();

	for(var i in r_load) {
		var id = r_load[i];
		var img = document.createElement('img');
		img.src = id + '.svg';
		r[id] = img;
	}

	parse_options();

	start_game();
	
	canvas.addEventListener('mousemove', mouse_move);
	canvas.addEventListener('mouseleave', mouse_leave);
	canvas.addEventListener('mousedown', mouse_click);

	draw();

	setInterval(draw, update_delay);
}

function mouse_leave() {
	hover = undefined;
	button_hover = false;
}

function start_game() {
	game_outcome = 0;

	doctors = {};
	bunnies = {};
	moves_left = moves_total;

	add_doctors(n_doctors);
	add_bunnies(n_well_bunnies, 0);
	add_bunnies(n_sick_bunnies, 1);

	update_alive_left();
	update_movables();
	
	check_state();
}

function update_alive_left() {
	alive_left = Object.keys(bunnies).length;
}

function draw_el(img, e, ratio) {
	ratio = ratio || 1;
	if(ratio != 0 && ratio != 1) {
		var ratio_margin = 0.2;
		ratio *= (1 - ratio_margin * 2);
		ratio += ratio_margin;
	}
	var x = e.x, y = e.y;
	if(e.update) {
		var px = e.px, py = e.py, nx = e.px + (e.ix ? delta / e.ix : 0),
			ny = e.py + (e.iy ? delta / e.iy : 0);
		var minx = Math.min(px, nx), maxx = Math.max(px, nx),
			miny = Math.min(py, ny), maxy = Math.max(py, ny);
		if(minx <= x && maxx >= x && miny <= y && maxy >= y)
			e.update = undefined;
		else {
			e.px = nx;
			e.py = ny;
			x = nx;
			y = ny;
		}
	}

	ctx.drawImage(img,
			0, 0, img.width * ratio, img.height,
			cell_size * x, cell_size * y, cell_size * ratio, cell_size);
}

function draw_star(x, y, delay, for_bunny) {
	var size;
	if(for_bunny === undefined)
		for_bunny = true;
	if(for_bunny) {
		size = cell_size * star_size;
		x = (x + star_x) * cell_size;
		y = (y + star_y) * cell_size;
	} else
		size = 800/12 * 0.7;

	ctx.save();

	ctx.translate(x, y);
	ctx.rotate((time + delay) * star_rotation_speed);
	ctx.drawImage(r.star, -size/2, -size/2, size, size);

	ctx.restore();
}

function victory() {
	for(var i in bunnies)
		if(bunnies[i].sick >= 1)
			return false;
	return true;
}

function defeat() {
	return Object.keys(bunnies).length == 0;
	for(var i in bunnies)
		if(bunnies[i].sick <= 0)
			return false;
	return true;
}

function draw_stars_right() {
	var text = undefined;
	if(game_outcome)
		text = str.end_game;
	else if(moves_left == 0)
		text = str.end_of_turn;

	ctx.fillStyle = 'white';
	if(text) {
		font(48);
		ctx.fillText(text, 850, 200 + font_size, 400 - 2 * 50);
		return;
	} else {
		font(32);
		ctx.fillText(str.moves_left, 850, 120 + font_size, 400 - 2 * 50);
	}

	var size = 800/12;

	var margin = size / 2;
	var def_x = 800 + margin, x = def_x, y = 200;
	for(var i = 0; i < moves_left; i++) {
		draw_star(x + size / 2, y, 0, false);

		x += size;
		if(x > (1200 - margin - size)) {
			y += size;
			x = def_x;
		}
	}
}

function bunny(x, y) {
	var p;
	if(y === undefined)
		p = [x.x, x.y];
	else
		p = [x, y];
	return bunnies[p];
}

function same_pos(a, b) {
	return a.x == b.x && a.y == b.y;
}

function quad_arrow(x, y, color) {
	ctx.save();
	ctx.fillStyle = color;
	ctx.strokeStyle = 'black';
	ctx.lineWidth = 0.0002 * cell_size;
	ctx.scale(cell_size, cell_size);
	ctx.translate(x + 0.5, y + 0.5);
	var ns = neighs(x,y);
	for(var i = 0; i < 4; i++) {
		if(in_board(ns[i]) && !bunny(ns[i])) {
			ctx.beginPath();
			ctx.moveTo(-0.5 + 0.1, 0.5 + 0.1);
			ctx.lineTo(-0.5 + 0.5, 0.5 + 0.5);
			ctx.lineTo(-0.5 + 0.9, 0.5 + 0.1);
			ctx.closePath();
			ctx.fillStyle = hover && same_pos(ns[i], hover) ?
				'yellow' : 'black';
			ctx.fill();
			ctx.stroke();
		}
		ctx.rotate(Math.PI / 2);
	}
	ctx.restore();
}

function square(x, y, color) {
	ctx.fillStyle = color;
	ctx.fillRect(x * cell_size, y * cell_size, cell_size, cell_size);
}

function show_options() {
	var e = document.getElementById('options');
	e.style.display = e.style.display == '' ? 'none' : '';
}

function resize() {
	var ratio = canvas.width / canvas.height;
	var width_ratio = 0.90;
	var height_ratio = 0.90;

	var screen_width = window.innerWidth
		|| document.documentElement.clientWidth
		|| document.body.clientWidth;

	var screen_height = window.innerHeight
		|| document.documentElement.clientHeight
		|| document.body.clientHeight;

	var screen_ratio = screen_width / screen_height;

	if(screen_ratio > ratio) { // large
		ch = height_ratio * screen_height;
		cw = width_ratio * screen_height * ratio;
	} else { // tall
		cw = width_ratio * screen_width;
		ch = height_ratio * screen_width / ratio;
	}

	canvas.style.width = '' + cw + 'px';
	canvas.style.height = '' + ch + 'px';
}

var button = { x:960, y:720, w:220, h:60 };

function button_action() {
	return game_outcome ? start_game : (moves_left ? end_turn : undefined);
}

function draw_button() {
	if(button_action() === undefined)
		return;

	ctx.fillStyle = 'grey';
	ctx.fillRect(button.x, button.y, button.w, button.h);

	ctx.fillStyle = button_hover ? 'white' : 'yellow';
	ctx.fillRect(button.x + 5, button.y + 5, button.w - 10, button.h - 10);

	font(32);
	var text;
	if(game_outcome)
		text = str.restart;
	else
		text = str.end_turn;
	ctx.fillStyle = 'black';
	ctx.fillText(text, 980, 728 + font_size, 180);
}

function format(s, val, tot) {
	return s.replace('%n', '' + val).replace('%p', '' + Math.round(100 * val / tot) + '%').
		replace('%%', '%');
}

var ref_time = new Date().getTime();
var time = 0;
var delta = 0;
function draw() {
	var new_time = new Date().getTime() - ref_time;
	delta = (new_time - time);
	time = new_time;

	ctx.fillStyle = '#558';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	for(var x = 0; x < board_size.x; x++)
		for(var y = 0; y < board_size.y; y++) {
			ctx.fillStyle = cell_background_colors[(x + y) % 2];
			ctx.fillRect(x * cell_size, y * cell_size, cell_size, cell_size);
		}

	if(hover && bunny(hover) && bunny(hover).movable)
		square(hover.x, hover.y, 'yellow');

	if(selected)
		square(selected.x, selected.y, 'yellow');

	for(var i in doctors)
		draw_el(r.house, doctors[i]);

	if(selected)
		quad_arrow(selected.x, selected.y, 'yellow');

	for(var i in bunnies) {
		var b = bunnies[i];
		if(b.sick == -1)
			draw_el(r.bunny_vac, b);
		else {
			draw_el(r.bunny, b);
			if(b.sick > 0)
				draw_el(r.bunny_sick, b, b.sick / sick_max);
		}
		if(b.movable && moves_left)
			draw_star(b.x, b.y, b.delay);
	}

	if(moves_left <= 10)
		ctx.drawImage(r.explain, 840, 300, 300, 512);

	ctx.fillStyle = 'white';
	font(32);
	ctx.fillText(str.title, 820, 10 + font_size, 400 - 2 * 20);

	var total_bunnies = n_well_bunnies + n_sick_bunnies;
	ctx.fillText(format(str.alive_left, alive_left, total_bunnies), 820,
			70 + font_size, 400 - 2 * 20);
	if(game_outcome)
		ctx.fillText(format(str.dead_count, total_bunnies - alive_left,
					total_bunnies), 820, 108 + font_size, 400 - 2 * 20);

	draw_button();
	draw_stars_right();

	//ctx.fillText('' + delta, 0, 30);
}

