# The Doors

A tiny top-down puzzle game. Vanilla HTML/CSS/JS — no build, no dependencies.

## The puzzle

Every room is identical: three doors ahead, one behind. A hidden 4-step
sequence opens the way forward. Pick a correct door and you advance; pick a
wrong one and you slip into a wrong room. Keep going forward from a wrong room
and you wander back to the start — with no sign you've looped.

The only way through is the one tell the rooms can't hide:

- Go **back from a correct room** → you return through the door you entered.
- Go **back from a wrong room** → you're spat out the *other* wrong door.

Take a door, step back, and watch which door you come out of. Same door, it
was right. Different door, it was wrong. Map the four steps that way.

## Play

Just open `index.html` in a browser — nothing to install.

Or serve it:

```bash
python3 -m http.server 8099
# http://localhost:8099
```

## Seeds

The combination is random each run, derived from a seed shown small at the
bottom of the screen. Reproduce a specific combination with `?seed=ABC`
(base36). **Restart** rolls a new one.

Controls: **WASD** / **Arrow keys** to move; walk into a door to use it.
