Rocks! - an HTML canvas implementation of Asteroid

**Introduction**

I love the old vector-graphics Atari arcade games of yore, so I figured I'd start out with one of the simplest ones, so that I can concentrate on making a reasonably performing engine as a basis for more-complex games in the next couple of months.

First question:
Are the canvas line-drawing primitives fast enough to make something like this sensible to attempt?

Answer:
Apparently so - running on Chrome, I get about 60FPS animating over 500 objects at once. Granted, the "simulation" doesn't include collisions or gravity or any kind of physics other than Newton's First Law, but there's clearly some headroom for a game with a more reasonable number of on-screen objects. I'll optimize things a bit once I have a better idea where the bottlenecks are.

**Ongoing investigations**

* How do I make sounds?

**Implementation details**

The current version is as simple as it gets - I use requestAnimationFrame to schedule updates, and for each frame, the canvas is cleared with black, and then the objects are drawn on top of it, one by one.

For a game with more blank space on-screen, it might be faster to only update the parts that are actually changing, but a single solid-pattern fill operation is going to be very fast, if the Canvas implementation is at all reasoably written.


