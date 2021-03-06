(function() {
    console.log('chrome extension: lichess clock dials');

    var lichess = document.querySelector('#lichess');
    var myClock = lichess.querySelector('.clock.clock_bottom'),
        opClock = lichess.querySelector('.clock.clock_top'),
        gameTime = null,
        p = Math.PI,
        isAlertOn = false,
        myBurner, myLoader, mySpinner, opIncLoader,
        opBurner, opLoader, opSpinner;

    // read game time from lichess data obj
    try {
        var script = document.querySelectorAll('script')[2].textContent;
        script = script.substr(script.indexOf('data: ') + 6);
        script = script.substr(0, script.indexOf('i18n:'));
        script = script.substr(0, script.lastIndexOf(',')).trim();
        var data = JSON.parse(script);
    } catch(e) {
        console.log('Lichess Clock data not available on this page for clocks chrome extension.');
    }

    setTimeout(function() {
        if (document.body.classList.contains('playing')) {
            if (data && data.clock) {
                gameTime = data.clock.initial;
            } else {
                var myGameTime = readTime(myClock);
                var opGameTime = readTime(opClock);
                gameTime = myGameTime || hisGameTime;
            }

            // dont show clocks if  game time is not determined
            if (gameTime !== null) {

                var myTime = readTime(myClock);
                var opTime = readTime(opClock);

                chrome.storage.sync.get({
                    clockFace: 'dials'
                }, function(items) {
                    if (items.clockFace === 'dials') {
                        insertDials();
                        drawDial(myTime, opTime, true);
                        tickDial();
                    }
                    else if (items.clockFace === 'incbar') {
                        insertIncBar();
                        tickBar();
                    }
                });
            }
        }
    }, 200);

    function insertIncBar() {
        var lichessGround = lichess.querySelector('.lichess_ground');
        var parentLG = lichessGround.parentNode;

        var burnerDiv = document.createElement('div');
        burnerDiv.classList.add('incbar');

        var myBurnerContainer = document.createElement('div');

        var opBurnerContainer = document.createElement('div');
        // opBurnerContainer.classList.add('opBurnerContainer');

        myBurner = document.createElement('div');
        myBurner.classList.add('myBurner');
        opBurner = document.createElement('div');
        opBurner.classList.add('opBurner');

        myBurnerContainer.appendChild(myBurner);
        opBurnerContainer.appendChild(opBurner);

        var sep = document.createElement('div');
        sep.classList.add('sep');

        burnerDiv.appendChild(myBurnerContainer);
        burnerDiv.appendChild(sep);
        burnerDiv.appendChild(opBurnerContainer);

        parentLG.insertBefore(burnerDiv, lichessGround);
    }
    function insertDials() {
        var burner = `
        <svg class='timer rotate'>
            <path class='loader' transform='translate(120, 120)'/>
            <path class='oploader' transform='translate(120, 120)'/>
            <path class='spinner hide'
                    d='M25.251,6.411c-10.318,0-18.683,8.365-18.683,18.683h4.068c0-8.071,6.543-14.615,14.615-14.615V6.461z' >
                <animateTransform attributeType='xml' attributeName='transform'
                    type='rotate'
                    from='0 25 25'
                    to='360 25 25'
                    dur='.5s' repeatCount='indefinite'/>
            </path>
        </svg>
        `;
        myBurner = document.createElement('div');
        opBurner = document.createElement('div');

        myBurner.setAttribute('id', 'myBurner');
        opBurner.setAttribute('id', 'opBurner');

        myBurner.innerHTML = burner;
        opBurner.innerHTML = burner;

        lichess.appendChild(opBurner);
        lichess.appendChild(myBurner);

        myLoader = myBurner.querySelector('.loader');
        opIncLoader = myBurner.querySelector('.oploader');
        opLoader = opBurner.querySelector('.loader');

        mySpinner = myBurner.querySelector('.spinner');
        opSpinner = opBurner.querySelector('.spinner');
    }

    function tickDial() {
        setTimeout(function() {
            var myTime = readTime(myClock);
            var opTime = readTime(opClock);

            drawDial(myTime, opTime, true); // turning true - li clock may go to 0 and this might skip update

            if (document.body.classList.contains('playing')) {
                tickDial();
            } else {
                mySpinner.classList.add('hide');
                opSpinner.classList.add('hide');
            }
        }, 200);
    }

    function tickBar() {
        setTimeout(function() {
            var myTime = readTime(myClock);
            var opTime = readTime(opClock);

            drawIncBar(myTime, opTime);

            if (document.body.classList.contains('playing')) {
                tickBar();
            }
        }, 200);
    }

    function drawIncBar(myTime, opTime) {
        if (myTime === opTime) {
            myBurner.style.height = '0%';
            opBurner.style.height = '0%';
        } else if (myTime > opTime) {
            myBurner.style.height = ((myTime - opTime) / (myTime + opTime) * 100) + '%';
            opBurner.style.height = '0%';
        } else {
            opBurner.style.height = ((opTime - myTime) / (myTime + opTime) * 100) + '%';
            myBurner.style.height = '0%';
        }
    }

    function drawDial(myTime, opTime, force) {
        if (data && data.clock && data.clock.increment) {
            drawIncrementDial(myTime, opTime);
        }
        else {
            drawSeparateDials(myTime, opTime, force);
        }
    }

    function drawIncrementDial(myTime, opTime) {
        drawPie(myTime, myBurner, mySpinner, myLoader, opTime, opIncLoader);
    }

    function drawSeparateDials(myTime, opTime, force) {
        if (force || myClock.classList.contains('running')) {
            drawPie(myTime, myBurner, mySpinner, myLoader);
        }
        if (force || opClock.classList.contains('running')) {
            drawPie(opTime, opBurner, opSpinner, opLoader);
        }
    }

    function drawPie(time, clock, spinner, loader, opTime = null, opLoader = null) {
        if (time < 7 && !isAlertOn) {
            spinner.classList.remove('hide');
            isAlertOn = true;
        } else if (time >= 7 && opTime !== null && isAlertOn) {
            spinner.classList.add('hide');
            isAlertOn = false;
        }

        if (opTime === null) {
            // 2 dials
            time = 360 - time * 360 / gameTime || .01;
            pie(time, loader, false);
        } else {
            // incremental 1 dial
            var m = (360 - (time / (time + opTime)) * 360) || .01;
            var h = ((opTime / (time + opTime)) * 360) || .01;

            pie(m, loader);
            pie(h, opIncLoader, true);
        }
    }

    function pie(time, loader, reverse) {
        var r = ( time * p / 180 ),
            x = Math.sin( r ) * 120,
            y = Math.cos( r ) * -120,
            mid = ( time > 180) ? reverse ? 1 : 0 : reverse ? 0 : 1,
            anim = 'M 0 0 v -120 A 120 120 1 '
                + mid + (reverse ? ' 1 ' : ' 0 ')
                +  x  + ' '
                +  y  + ' z';
        loader.setAttribute('d', anim);
    }

    function readTime(clock) {
        var timer = clock.querySelector('.time');
        return timer ? toSeconds(timer.textContent) : 0;
    }

    function toSeconds(time) {
        var parts = time.trim().split(':');
        var m = parseInt(parts[0]);
        var secParts = parts[1].split('.');
        var s = parseInt(secParts[0]);
        var h = secParts.length > 1 ? parseInt(secParts[1].substr(0, 1)) : 0;
        var val = m * 60 + s + h / 10;
        return val;
    }
})();
