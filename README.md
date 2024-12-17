Rocks! - an HTML canvas implementation of Asteroid

**Introduction**

I love the old vector-graphics Atari arcade games of yore, so I figured I'd start out with one of the simplest ones, so that I can concentrate on making a reasonably performing engine as a basis for more-complex games in the next couple of months.

**How to play**
[Play Here!](https://mbessey.github.io/Rocks/)
Left & Right arrow keys to turn, up arrow to fire thrusters, space to fire, down for shield. Don't hit the rocks, and watch out for UFOs.

**Known bugs**

* Sound occasionally flakes out - weird glitches, or the engine sound sticking on.

**Missing features**
* Enemies. Hopefully will have at least one by end of the month.
* Needs touch controls for iOS & Android browsers
* Offline mode

**FAQ**

*Q:* Are the canvas line-drawing primitives fast enough to make something like this sensible to attempt?

*A*: Apparently so - running on Chrome, I get about 60FPS animating over 500 objects at once. Granted, that "simulation" didn't include collisions or gravity or any kind of physics other than Newton's First Law, but there's clearly some headroom for a game with a more reasonable number of on-screen objects. I'll optimize things a bit once I have a better idea where the bottlenecks are.

**Ongoing investigations**

* Why does the sound flake out sometimes? Too many voices at once, maybe?

**Implementation details**

The current version is as simple as it gets - I use requestAnimationFrame to schedule updates, and for each frame, the canvas is cleared with black, and then the objects are drawn on top of it, one by one.

For a game with more blank space on-screen, it might be faster to only update the parts that are actually changing, but a single solid-pattern fill operation is going to be very fast, if the Canvas implementation is at all reasoably written.

