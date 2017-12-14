// global variables

/*jslint devel: true, vars: true, white: true */
var myCanvas;
var ctx;
var timer;
var canvasXSize = 600;
var canvasYSize = 600;
var stepCount;
var balls = [];  // the array of all the game balls
var mNumBalls = 0;
var numTestBalls = 10;
var bLoopRunning = false;
var bInitialized = false;
var colors = ["red", "green", "blue", "yellow", "purple", "orange", "cyan", "magenta", "white", "gray"];
var ballRadius = 10;
var ballMaxRadii = [50, 40, 30];  // easy, medium, hard
var ballMaxLifeTimes = [60, 50, 40];
var ballRadiusIncrement = 1;
var stepTimeInc = 15;  // in msecs
var maxSpeed = 6;  // in pixels per move
var bUserClicked = false;
var numBallsKilledThisLevel = 0;
var scoreThisLevel = 0;
var score = 0;
var levels = [];
var numLevels = 5;  // TODO
var numCurLevel = 0;
var numBallsMissedThisLevel;
var backgroundColor = "#888888";
// play level - 1 is easy, 3 is hard
var playLevel = 1;  

////////////////////////////////////////////////////////////////////////////
// misc utilities
////////////////////////////////////////////////////////////////////////////

// randomBetween - generate a random integer between two input values
function randomBetween(low, high) 
{
    "use strict";
    if (low >= high) 
    {
        console.error("randomBetween - low is bigger than high");
    }
    // get a random integer between 0 and (high - low)
    var tmpRandInt = Math.floor(Math.random() * Math.abs(high - low)),
        retVal = tmpRandInt + low;
    return retVal;
}

////////////////////////////////////////////////////////////////////////////
// Ball object class (prototype)
////////////////////////////////////////////////////////////////////////////

// Ball "class"
function Ball(xPos, yPos, xDir, yDir, radius, color, playLevel) 
{
    "use strict";
    /////////////////////////////////////////////
    // member data
        
    // the current position of the ball
    var m_xPos = xPos;
    var m_yPos = yPos;
    // the current direction of the ball (delta x,y)
    var m_xDir = xDir;
    var m_yDir = yDir;
    // the current ball radius
    var m_radius =  radius;
    // ball color
    var m_color = color;
    // the amount an exploding ball changes on each time step
    var m_ballRadiusIncrement = ballRadiusIncrement;
    // whether the ball is currently an "exploding" ball
    var m_bIsExploding = false;
    // whether the ball has reached it maximum radius, and has started its lifetime timer
    var m_bLifeTimerStarted = false;
    // current value of the lifetime timer
    var m_lifeTimeTimer = 0;
    // the current ball's score
    var m_score = 0;
    // the current "chain number" for this ball - affects its score
    var m_chainNumber=  0;
    
    // playLevel-specific attributes
    
    // playLevel is 1-based, we need 0 based
    // the maximum radius of the ball - when it reaches this radius, it starts to die
    var m_maxRadius = ballMaxRadii[playLevel-1];
    // the maximum lifetime after the lifetime timer has started, before the ball dies
    var m_maxLifeTime = ballMaxLifeTimes[playLevel-1];
  
    return {
        
        // the current position of the ball
        xPos: m_xPos,
        yPos: m_yPos,
        // the current direction of the ball (delta x,y)
        xDir: m_xDir,
        yDir: m_yDir,
        // the current ball radius
        radius: m_radius,
        // ball color
        color: m_color,
        // the amount an exploding ball changes on each time step
        ballRadiusIncrement: m_ballRadiusIncrement,
        // whether the ball is currently an "exploding" ball
        bIsExploding: m_bIsExploding,
        // whether the ball has reached it maximum radius, and has started its lifetime timer
        bLifeTimerStarted: m_bLifeTimerStarted,
        // current value of the lifetime timer
        lifeTimeTimer: m_lifeTimeTimer,
        // the current ball's score
        score: m_score,
        // the current "chain number" for this ball - affects its score
        chainNumber: m_chainNumber,
        
        // playLevel-specific attributes
        
        // playLevel is 1-based, we need 0 based
        // the maximum radius of the ball - when it reaches this radius, it starts to die
        maxRadius: m_maxRadius,
        // the maximum lifetime after the lifetime timer has started, before the ball dies
        maxLifeTime: m_maxLifeTime,
        
        ////////////////////////////////////////////////
        // misc methods
        
        // draw - draw one ball
        draw: function () 
        {
            "use strict";
            // draw exploding balls in a gradient
            var grd;
            if (this.bIsExploding)
            {
                // Create gradient
                grd = ctx.createRadialGradient(this.xPos, this.yPos, 5, this.xPos, this.yPos, this.radius);
                grd.addColorStop(0,this.color);
                grd.addColorStop(1,"white");
        
                // Fill with gradient
                ctx.fillStyle = grd;
            }
            else
            {
                ctx.fillStyle = this.color;
            }
        	// draw the ball in its new location
        	ctx.beginPath();
        	ctx.arc(this.xPos, this.yPos, this.radius, 0, 2 * Math.PI);
        	ctx.closePath();
        	ctx.fill();
        },
        
        // setPlayLevel - this function sets the play level for this ball
        // 1 is easy, 3 is hard
        setPlayLevel: function(playLevel)
        {
            "use strict";
            if (playLevel < 1)
            {
                playLevel = 1;
            }
            if (playLevel > 3)
            {
                playLevel = 3;
            }
            // play levels are 1-3, subtract to get index
            this.maxRadius = ballMaxRadii[playLevel-1];
            this.maxLifetime = ballMaxLifeTimes[playLevel-1];
        },

        // makeExploding - put this ball into exploding state
        // otherBall is the ball that hit it to make it explode undefined for a
        // user-clicked ball
        makeExploding: function(otherBall)
        {
            "use strict";
            // exploding balls no longer move
            this.xDir = 0;
            this.yDir = 0;
            
            this.bIsExploding = true;
            
            if (!(otherBall === undefined))
            {
                // an exploding ball has a one higher chain number than the ball
                // that hit it
                this.chainNumber = otherBall.chainNumber + 1;
                // update the score
                // formula for the score is:  the ball's chain number raised to the power of 3, times 100
                this.score = Math.pow(this.chainNumber, 3) * 100;
            }
            else
            {
                // this is a user-clicked ball (the first exploding ball in a level)
                this.chainNumber = 0;
                this.score = 0;
            }
        },
        
        // doTimeStep - perform one time step for this ball
        doTimeStep: function()
        {
            "use strict";
            if (!this.bIsExploding)
            {
                // still in "moving ball" mode
                // update position
                this.xPos = this.xPos + this.xDir;
                this.yPos = this.yPos + this.yDir;
                
                // check for wall collisions
                if ((this.xPos < this.radius) || (this.xPos > (canvasXSize - this.radius)))
                {
                    // hit the left or right wall
                    // just reverse the x component of the direction
                    this.xDir = -this.xDir;
                    // sometimes they seem to get "stuck" at a wall.  
                    // Move it out by one increment
                    this.xPos = this.xPos + this.xDir;
                    this.yPos = this.yPos + this.yDir;           
                }
                
                if ((this.yPos < this.radius) || (this.yPos > (canvasYSize - this.radius)))
                {
                    // hit the top or bottom wall
                    // just reverse the y component of the direction
                    this.yDir = -this.yDir;
                    // sometimes they seem to get "stuck" at a wall.  
                    // Move it out by one increment
                    this.xPos = this.xPos + this.xDir;
                    this.yPos = this.yPos + this.yDir;
                }
            }
            else
            {
                // ball is in "exploding" mode
                if (this.radius < this.maxRadius)
                {
                    // ball is still expanding, update the radius
                    this.radius += this.ballRadiusIncrement;
                }
                else
                {
                    // ball is at maximum radius, start a "lifetime" timer - ball exists for some time at its maximum radius before dying
                    if (!this.bLifeTimerStarted)
                    {
                        this.bLifeTimerStarted = true;
                        this.lifeTimeTimer = 0;
                    }
                    // increment the lifetime timer
                    this.lifeTimeTimer = this.lifeTimeTimer + 1;
                    
                    // if we're at the end of life, return false (meaning object should go away)
                    if (this.lifeTimeTimer >= this.maxLifeTime)
                    {
                        return false;
                    }
                    else
                    {
                        return true;
                    }
                }
            }
            return true;
        
        }
        
    };  // end of return bracket for Ball object
}  // Ball()




////////////////////////////////////////////////////////////////////////////
// ball-related utilities
////////////////////////////////////////////////////////////////////////////

// makeRandomBall - return a ball with random position, direction, color
function makeRandomBall() 
{
    "use strict";
    // we don't want a completely horizontal or vertical direction
    var tmpXDir = 0;
    while (tmpXDir === 0) 
    {
        tmpXDir = randomBetween(-maxSpeed, maxSpeed);
    }
    var tmpYDir = 0;
    while (tmpYDir === 0) 
    {
        tmpYDir = randomBetween(-maxSpeed, maxSpeed);
    }
    var tmpXPos = randomBetween(ballRadius, (canvasXSize - ballRadius));
    var tmpYPos = randomBetween(ballRadius, (canvasYSize - ballRadius));
    var tmpColorIdx = randomBetween(0, (colors.length - 1));
    var tmpColor = colors[tmpColorIdx];
    var tmpBall = Ball(tmpXPos, tmpYPos, tmpXDir, tmpYDir, ballRadius, tmpColor, playLevel);
    return tmpBall;
}

// addRandomBall - make a ball and add it to the collection
function addRandomBall()
{
    "use strict";
    var tmpBall = makeRandomBall();
    balls[balls.length] = tmpBall;
}

// addOneBallAtPosition - add a ball to the game at a given XY location
function addOneBallAtPosition(x, y)
{
    "use strict";
    var tmpBall = makeRandomBall();
    // set the x,y location
    tmpBall.xPos = x;
    tmpBall.yPos = y;
    // add it to the balls array
    balls[balls.length] = tmpBall;
    return tmpBall;
}

// collision2D - set new ball directions of two colliding balls
//
//   This method is a 'remote' 2D-collision detector for two balls on linear
//   trajectories and returns, if applicable, the location of the collision for 
//   both balls as well as the new velocity vectors (assuming a partially elastic
//   collision as defined by the restitution coefficient).
//
//   All variables apart from 'mode' and 'error' are of Double Precision
//   Floating Point type.
//
//   The Parameters are:
//
//    mode  (char) (if='f' alpha must be supplied; otherwise arbitrary)
//    alpha (impact angle) only required in mode='f'; 
//                     should be between -PI/2 and PI/2 (0 = head-on collision))
//    m1   (mass of ball 1)
//    m2   (mass of ball 2)
//    r1   (radius of ball 1)        not needed for 'f' mode
//    r2   (radius of ball 2)                "
//  & x1   (x-coordinate of ball 1)          "
//  & y1   (y-coordinate of ball 1)          "
//  & x2   (x-coordinate of ball 2)          "
//  & y2   (y-coordinate of ball 2)          "
//  & vx1  (velocity x-component of ball 1) 
//  & vy1  (velocity y-component of ball 1)         
//  & vx2  (velocity x-component of ball 2)         
//  & vy2  (velocity y-component of ball 2)
//
//   Note that the parameters with an ampersand (&) are passed by reference,
//   i.e. the corresponding arguments in the calling program will be updated;
//   however, the coordinates and velocities will only be updated if 'error'=0.
//
//   All variables should have the same data types in the calling program
//   and all should be initialized before calling the function even if
//   not required in the particular mode.
//
//   This program is free to use for everybody. However, you use it at your own
//   risk and I do not accept any liability resulting from incorrect behaviour.
//   I have tested the program for numerous cases and I could not see anything 
//   wrong with it but I can not guarantee that it is bug-free under any 
//   circumstances.
//
//   I would appreciate if you could report any problems to me
//   (for contact details see  http://www.plasmaphysics.org.uk/feedback.htm ).
//
//   Thomas Smid, January  2004
//                December 2005 (corrected faulty collision detection; 
//                               a few minor changes to improve speed;
//                               added simplified code without collision detection)
//                December 2009 (generalization to partially inelastic collisions)
function collision2D(b1, b1mass, b2, b2mass) 
{
    "use strict";
    var r1 = b1.radius;
    var r2 = b2.radius;
    var x1 = b1.xPos;
    var y1 = b1.yPos;
    var x2 = b2.xPos;
    var y2 = b2.yPos;
        
    var vx1 = b1.xDir;
    var vy1 = b1.yDir;
    var vx2 = b2.xDir;
    var vy2 = b2.yDir;
        
    var m1 = b1mass;
    var m2 = b2mass;
    
    var r12, m21, d, gammav, gammaxy, dgamma, dr, dvx2, a, x21, y21, vx21, vy21;
    var pi2, vx_cm, vy_cm, R, alpha;
    
    //     ***initialize some variables ****
    pi2 = 2 * Math.acos(-1.0E0);
    r12 = r1 + r2;
    m21 = m2 / m1;
    x21 = x2 - x1;
    y21 = y2 - y1;
    vx21 = vx2 - vx1;
    vy21 = vy2 - vy1;
    // R is the restitution coefficient:  0 to 1 (1 is perfectly elastic)
    //R = 0.8;
    R = 1.0;
    
    vx_cm = (m1 * vx1 + m2 * vx2) / (m1 + m2);
    vy_cm = (m1 * vy1 + m2 * vy2) / (m1 + m2);
    
    //     ****  return old positions and velocities if relative velocity =0 ****
    if (vx21 === 0 && vy21 === 0) 
    {
        return;
    }
    
    //     *** calculate relative velocity angle             
    gammav = Math.atan2(-vy21, -vx21);
    
    d = Math.sqrt(x21 * x21 + y21 * y21);
    
    //     **** return if distance between balls smaller than sum of radii ***
    //if (d<r12) {return;}
    
    //     *** calculate relative position angle and normalized impact parameter ***
    gammaxy = Math.atan2(y21, x21);
    dgamma = gammaxy - gammav;
    if (dgamma > pi2) 
    {
        dgamma = dgamma - pi2;
    } 
    else if (dgamma < -pi2) 
    {
        dgamma = dgamma + pi2;
    }
    dr = d * Math.sin(dgamma) / r12;
    
    //     **** return old positions and velocities if balls do not collide ***
    if ((Math.abs(dgamma) > pi2 / 4 && Math.abs(dgamma) < 0.75 * pi2) || Math.abs(dr) > 1) 
    {
        return;
    }
    
    //     **** calculate impact angle if balls do collide ***
    alpha = Math.asin(dr);
    
    //     **** calculate time to collision ***
    //       dc=d*cos(dgamma);
    //       if (dc>0) {sqs=1.0;} else {sqs=-1.0;}
    //       t=(dc-sqs*r12*sqrt(1-dr*dr))/sqrt(vx21*vx21+ vy21*vy21);
    //    **** update positions ***
    //       x1=x1+vx1*t;
    //       y1=y1+vy1*t;
    //       x2=x2+vx2*t;
    //       y2=y2+vy2*t;
    
    
    //     ***  update velocities ***
    
    a = Math.tan(gammav + alpha);
    
    dvx2 = -2 * (vx21 + a * vy21) / ((1 + a * a) * (1 + m21));
    
    vx2 = vx2 + dvx2;
    vy2 = vy2 + a * dvx2;
    vx1 = vx1 - m21 * dvx2;
    vy1 = vy1 - a * m21 * dvx2;
    
    //     ***  velocity correction for inelastic collisions ***
    
    vx1 = (vx1 - vx_cm) * R + vx_cm;
    vy1 = (vy1 - vy_cm) * R + vy_cm;
    vx2 = (vx2 - vx_cm) * R + vx_cm;
    vy2 = (vy2 - vy_cm) * R + vy_cm;
    
    b1.xDir = vx1;
    b1.yDir = vy1;
    b2.xDir = vx2;
    b2.yDir = vy2;
}

// ballsCollide - find out if two balls collide - returns true or false
function ballsCollide(b1, b2) 
{
    "use strict";
	var distX = Math.abs(b1.xPos - b2.xPos);
    var distY = Math.abs(b1.yPos - b2.yPos);
    var dist = Math.sqrt(distX * distX + distY * distY);
	
	if (dist <= (b1.radius + b2.radius)) 
    {
		return true;
    } 
    else 
    {
		return false;
    }
}

// doBallCollisonsToAllBalls - this function handles collisions between all game balls
function doBallCollisionsToAllBalls()
{
    "use strict";
    // create an array to hold exploding balls, for efficiency
    var newExplodingBalls = [];
    var newExplodingBallIdx = 0;
    var ballIdx = 0;
    for (ballIdx = 0; ballIdx < balls.length; ballIdx = ballIdx + 1)
    {
        var ball = balls[ballIdx];
        if (!ball.bIsExploding)
        {
            var testBallIdx = 0;
            for (testBallIdx = 0; testBallIdx < balls.length; testBallIdx = testBallIdx + 1)
            {
                // don't compare the same ball
                if (ballIdx === testBallIdx)
                {
                    continue;
                }
                var testBall = balls[testBallIdx];
                
                // if a regular ball collides with an exploding ball
                // then it becomes an exploding ball at its current location
                if (ballsCollide(ball, testBall))
                {
                    // if testBall is exploding, then ball becomes exploding, too
                    if (testBall.bIsExploding)
                    {
                        // set ball to exploding state
                        ball.makeExploding(testBall);
                        // add it to the list of new exploding balls
                        newExplodingBalls[newExplodingBallIdx] = ball;
                        newExplodingBallIdx = newExplodingBallIdx + 1;
                        addExplodingBallToScore(ball);
                        numBallsKilledThisLevel = numBallsKilledThisLevel + 1;
                    }
                    else
                    {
                        // a ball collided with another regular ball, call the collision algorithm
                        collision2D(ball, 1.0, testBall, 1.0);
                    }
                }
            }
        }
    }
    // ?? do we need a list of exploding balls?  Maybe not
}

// drawAllBalls - draw the entire ball array
function drawAllBalls()
{
    "use strict";
    clearCanvas();
    var idx = 0;
    for (idx = 0; idx < balls.length; idx = idx + 1)
    {
        var ball = balls[idx];
        ball.draw();
    }
}

////////////////////////////////////////////////////////////////////////////
// GameLevel object class (prototype)
////////////////////////////////////////////////////////////////////////////

// GemeLevel "class"
function GameLevel(numInitialBalls, numTargetBalls) 
{
    "use strict";
    
    this.mNumInitialBalls = numInitialBalls;
    this.mNumTargetBalls = numTargetBalls;
    this.mbInitialized = false;
}

////////////////////////////////////////////////////////////////////////////
// game code
////////////////////////////////////////////////////////////////////////////

// handleClick - handle a mouse click in the canvas
function handleClick(event)
{
    "use strict";
    if (!bUserClicked)
    {
        var x = event.x;
        var y = event.y;

        x -= myCanvas.offsetLeft;
        y -= myCanvas.offsetTop;

        console.log("mouse click x:" + x + " y:" + y);
        var newBall = addOneBallAtPosition(x, y);
        // make it exploding.  The undefined implies that this ball is exploding
        // because the user clicked it, not because it hit another exploding ball
        newBall.makeExploding(undefined);
        // record the user clicked event
        bUserClicked = true;
    }
}

// init - initialize the game data
function init() 
{
    "use strict";
	myCanvas = document.getElementById("myCanvas");
	ctx = myCanvas.getContext("2d");
    
    // add an event listener for mouse down
    myCanvas.addEventListener("mousedown", handleClick, false);
	
	// fill the canvas with a background
	ctx.fillStyle = "#888888";
	ctx.fillRect(0, 0, canvasXSize, canvasYSize);
    
    // misc initialization
    bUserClicked = false;
    numBallsKilledThisLevel = 0;
    scoreThisLevel = 0;
    score = 0;
    backgroundColor = "#888888";
    
    // initialize the game levels 
    // each level is class with two integers
    // the first is the initial number of random balls in the level
    // the second is the number of balls that you need to kill to pass the level
    levels = [];
    var tmpLevel = new GameLevel(5, 1);
    levels[0] = tmpLevel;
    tmpLevel = new GameLevel(10, 2);
    levels[1] = tmpLevel;
    tmpLevel = new GameLevel(15, 4);
    levels[2] = tmpLevel;
    tmpLevel = new GameLevel(20, 6);
    levels[3] = tmpLevel;
// TODO - uncomment these!!!
//    tmpLevel = new GameLevel(25, 10);
//    levels[4] = tmpLevel;
//    tmpLevel = new GameLevel(30, 15);
//    levels[5] = tmpLevel;
//    tmpLevel = new GameLevel(35, 18);
//    levels[6] = tmpLevel;
//    tmpLevel = new GameLevel(40, 22);
//    levels[7] = tmpLevel;
//    tmpLevel = new GameLevel(45, 30);
//    levels[8] = tmpLevel;
//    tmpLevel = new GameLevel(50, 37);
//    levels[9] = tmpLevel;
//    tmpLevel = new GameLevel(55, 48);
//    levels[10] = tmpLevel;
//    tmpLevel = new GameLevel(60, 55);
//    levels[11] = tmpLevel;
    numLevels = levels.length;
    
    numCurLevel = 0;

//	// init ball data - 
//    // generate some temporary balls, put them into the array
//    var idx = 0;
//    for (idx = 0; idx < numTestBalls; idx = idx + 1) 
//    {
//        var tmpBall = makeRandomBall();
//        balls[idx] = tmpBall;
//    }
    
    // initialize the play level from the Level input
    var playLevelItems = document.getElementsByName("playLevel");
    var tmpPlayLevel;
    var ix = 0;
    for (ix = 0; ix < playLevelItems.length; ix = ix + 1)
    {
        if (playLevelItems[ix].checked)
        {
            tmpPlayLevel = playLevelItems[ix].value;
        }
    }
    playLevel = tmpPlayLevel;
	
	// init step count
	stepCount = 1;
    
}

// getNumBallsLeftToKill - return the number of balls still needed for this level
function getNumBallsLeftToKill()
{
    "use strict";
    var gameLevel = levels[numCurLevel];
    var numLeft = gameLevel.mNumTargetBalls - numBallsKilledThisLevel;
    if (numLeft < 0)
    {
        numLeft = 0;
    }
    return numLeft;
}

// initForLevel - intialize for the start of a new level
function initForLevel(nLevel)
{
    "use strict";
    var level = levels[nLevel];
    var numBalls = level.mNumInitialBalls;
    numBallsKilledThisLevel = 0;
    scoreThisLevel = 0;
    // initialize the set of balls for the level
    balls = [];  // could also apparently use balls.length = 0;
    var idx = 0;
    for (idx = 0; idx < numBalls; idx = idx + 1)
    {
        addRandomBall();
    }
    
    bUserClicked = false;
    // mark the level initialized
    level.mbInitialized = true;
    backgroundColor = "#888888";
}

// LevelEndCondition - an "enum" for the condition for which a level is ended
var LevelEndCondition = {
    LevelContinues : 0, 
    LevelGoalMet : 1,
    LevelOverSuccessfully : 2,
    LevelOverUnsuccessfully : 3,
    GameOver : 4 };

// isLevelOver - check if the level is finished
function isLevelOver()
{
    "use strict";
    // conditions for ending the level:
    // 1. after the user created the first "exploding" ball by clicking on the screen,
    //    if all the "exploding" balls are gone, the level is over
    // 2. all the balls are gone
    var tmpLevelEndCondition = LevelEndCondition.LevelContinues;
    var curLevel = levels[numCurLevel];
    
    // if the user has not yet clicked, the level is not over
    if (!bUserClicked)
    {
        tmpLevelEndCondition = LevelEndCondition.LevelContinues;
    }
    else
    {
        // if there are no more exploding balls, the level is over
        var bAnyExploding = false;
        var idx = 0;
        for (idx = 0; idx < balls.length; idx = idx + 1)
        {
            var ball = balls[idx];
            if (ball.bIsExploding)
            {
                bAnyExploding = true;
                break;
            }
        }
        // if none are exploding, and the user has clocked, it 
        // means that all the explosions have finished
        if (!bAnyExploding)
        {
            if (numBallsKilledThisLevel >= curLevel.mNumTargetBalls)
            {
                tmpLevelEndCondition = LevelEndCondition.LevelOverSuccessfully;
            }
            else
            {
                tmpLevelEndCondition = LevelEndCondition.LevelOverUnsuccessfully;
            }
        }
        else
        {
            // if all the balls are gone, the level ends successfully
            if (balls.length === 0)
            {
                tmpLevelEndCondition = LevelEndCondition.LevelOverSuccessfully;
            }
            
            // finally, check to see whether we've met our goal
            if ((LevelEndCondition === LevelEndCondition.LevelContinues) && (numBallsKilledThisLevel >= curLevel.mNumTargetBalls))
            {
                tmpLevelEndCondition = LevelEndCondition.LevelGoalMet;
            }
        }
    }
    // check for the number of balls remaining.  If it is 0, change tbe background color
    // to indicate that the level is over
    var numBallsRemaining = getNumBallsLeftToKill();
    // once we've hit the number of balls, switch to a lighter gray
    if (numBallsRemaining === 0)
    {
        backgroundColor = "#CCCCCC";
    }
    return tmpLevelEndCondition;
}

// addExplodingBallToScore - add the score from an exploding ball to the game score for this level
function addExplodingBallToScore(explodingBall)
{
    "use strict";
    scoreThisLevel += explodingBall.score;
}

// clearCanvas - clear the canvas - called in between each game loop iteration
function clearCanvas() 
{
    "use strict";
	// undraw all the balls by drawing the background
    ctx.fillStyle = backgroundColor;
	ctx.fillRect(0, 0, canvasXSize, canvasYSize);
}

// toggleMainLoop - used to start/stop the main game loop
function toggleMainLoop(bGameOver) 
{
    "use strict";
    if (!bInitialized) 
    {
        init();
        bInitialized = true;
    }
    
    var continueButton = document.getElementById("level_continue");
    if (!bLoopRunning) 
    {
        // make the "continue" button hidden
        continueButton.style.visibility = "hidden";
        bLoopRunning = true;
        timer = setInterval(mainLoop, stepTimeInc);
        document.getElementById("start_stop").innerHTML = "Pause";
    } 
    else
    {
        if (!bGameOver)
        {
            // make the "continue" button visible
            var tmpButtonXPos = canvasXSize/2 + myCanvas.offsetLeft - 50;
            var tmpButtonYPos = canvasYSize/2 + myCanvas.offsetTop + 70;
            continueButton.style.left = tmpButtonXPos + "px";
            continueButton.style.top = tmpButtonYPos + "px";
            continueButton.style.visibility = "visible";
        }
        bLoopRunning = false;
        clearInterval(timer);
        if (!bGameOver)
        {
            document.getElementById("start_stop").innerHTML = "Start";
        }
        else
        {
            document.getElementById("start_stop").innerHTML = "Restart";
        }
    }
}

// updateScoreUI - update the score UI
function updateScoreUI(bGameOver)
{
    "use strict";
    
    // update the HTML UI
    var levelUI = document.getElementById("level");
    if (!bGameOver)
    {
        levelUI.innerHTML = numCurLevel+1;
    }
    else
    {
        // if the game is over, don't show a level
        levelUI.innerHTML = "";
    }
    var levelScoreUI = document.getElementById("level_score");
    levelScoreUI.innerHTML = scoreThisLevel;
    var gameScoreUI = document.getElementById("game_score");
    gameScoreUI.innerHTML = score;
    
    // Update the UI in the Canvas
    // level on the lower left
    ctx.font="bold 15px Arial";
    ctx.fillStyle = "blue";
    ctx.textAlign = "left";
    if (!bGameOver)
    {
        var userLevel = numCurLevel + 1;
        ctx.fillText("Level " + userLevel, 10, canvasYSize - 10);
    
        // Level score in the upper left
        ctx.fillText("Level Score " + scoreThisLevel, 10, 20);

        // number of ball left in the lower right
        ctx.textAlign = "right";
        ctx.fillText("Balls Left " + getNumBallsLeftToKill(), canvasXSize-10, canvasYSize - 10);
    }

    // Game score in the upper right
    ctx.textAlign = "right";
    ctx.fillText("Game Score " + score, canvasXSize-10, 20);
}

// playLevelStep - play one step of the current level - this is the main game step
function playLevelStep()
{
    "use strict";
    // increment time
    stepCount = stepCount + 1;
    
    // have all balls do one time step
    var ballsToDelete = [];
    var ballsToDeleteIdx = 0;
    var ballIdx = 0;
    for (ballIdx = 0; ballIdx < balls.length; ballIdx = ballIdx + 1)
    {
        var ball = balls[ballIdx];
        if (!ball.doTimeStep())
        {
            // if doTimeStep returns false, that ball is dead,
            // put it on the list of balls to delete
            ballsToDelete[ballsToDeleteIdx] = ball;
            ballsToDeleteIdx = ballsToDeleteIdx + 1;
        }
        ball.draw();
    }
    updateScoreUI(false);
    
    // remove all of the dead balls
    for (ballsToDeleteIdx = 0; ballsToDeleteIdx < ballsToDelete.length; ballsToDeleteIdx = ballsToDeleteIdx + 1)
    {
        var ballToDelete = ballsToDelete[ballsToDeleteIdx];
        var tmpIdx = balls.indexOf(ballToDelete);
        balls.splice(tmpIdx, 1);
    }
    
    // handle collisions
    doBallCollisionsToAllBalls();
}

// playNextInteractiveLevelStep - play the next interactive level step and check end conditions
function playNextInteractiveLevelStep()
{
    "use strict";
    // if the level is not initialized, initialize it
    var curLevel = levels[numCurLevel];
    if (curLevel !== undefined)
    {
        if (curLevel.mbInitialized === false)
        {
            initForLevel(numCurLevel);
            curLevel.mbInitialized = true;
        }
    }
    
    // do the actual game step
    playLevelStep();
    
    // check to see if the level is over
    // if over successfully, then set the next level and continue
    var endCond = isLevelOver();
    if (endCond === LevelEndCondition.LevelOverUnsuccessfully)
    {
        // draw the balls one more time - to get rid of any remaining exploding balls
        drawAllBalls();
        // get the number of balls we missed, to show to the user
        numBallsMissedThisLevel = getNumBallsLeftToKill();
        // message to the user to start the next level
        ctx.font="bold 50px Arial";
        ctx.fillStyle = "red";
        ctx.textAlign = "center";
        ctx.fillText("Try Again!", canvasXSize/2, canvasYSize/2);
        ctx.fillText("Need to get " + numBallsMissedThisLevel + " more", canvasXSize/2, canvasYSize/2 + 50);
        console.log("number of balls to kill: " + numBallsMissedThisLevel);
        // re-initialize the level (start over)
        initForLevel(numCurLevel);
        // TODO - need a different UI to pause between levels
        toggleMainLoop(false);
        return endCond;
    }
    else if (endCond === LevelEndCondition.LevelOverSuccessfully)
    {
        // successfully finished the level - add the level score to the current game score
        // draw the balls one more time - to get rid of any remaining exploding balls
        drawAllBalls();
        score += scoreThisLevel;
        console.log("level " + numCurLevel + " completed.  Score: " + score);
        ctx.font="bold 50px Arial";
        ctx.fillStyle = "green";
        ctx.textAlign = "center";
        var userLevel = numCurLevel + 1;
        ctx.fillText("Level " + userLevel + " Completed!", canvasXSize/2, canvasYSize/2);
        // increment the level
        numCurLevel = numCurLevel + 1;
        
        // see if we've finished the last level
        if (numCurLevel >= levels.length)
        {
            return LevelEndCondition.GameOver;
        }
        else
        {
            // pause between levels
            toggleMainLoop(false);
       }
    }
    // level continues
    return endCond;
}

// end of game
function endOfGame()
{
    "use strict";
    toggleMainLoop(true);
    clearCanvas();
    // write on the canvas
    ctx.font="bold 70px Arial";
    ctx.fillStyle = "red";
    ctx.textAlign = "center";
    ctx.fillText("You Win!", canvasXSize/2, canvasYSize/2);
    ctx.font="bold 40px Arial";
    ctx.fillText("Final Score: " + score, canvasXSize/2, canvasYSize/2 + 70);
    // zero out the level score, so it's not confusing
    scoreThisLevel = 0;
    updateScoreUI(true);
    numCurLevel = 0;
    bInitialized = false;  // to trigger an init on restart
}

// mainLoop - the main game loop
function mainLoop() 
{
    "use strict";
	clearCanvas();
    
    var endCond = playNextInteractiveLevelStep();
    if (endCond === LevelEndCondition.GameOver)
    {
        endOfGame();
    }
//	else if (stepCount > 1000) 
//    {
//		toggleMainLoop(false);
//	}
	
}

