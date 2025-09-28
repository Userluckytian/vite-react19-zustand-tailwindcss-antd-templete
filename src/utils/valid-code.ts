export type VCodeType = {
    code: string;
    dataURL: string;
};
export function createVCode(): VCodeType {
    const selfWidth = 90;
    const selfHeight = 30;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const temp = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPRSTUVWXYZ23456789'.split('');
    let vCode = '';
    const color = 'rgb(' + randInt(1, 120) + ',' + randInt(1, 120) + ',' + randInt(1, 120) + ')';

    canvas.width = selfWidth;
    canvas.height = selfHeight;
    ctx.fillStyle = '#f3fbfe';
    ctx.fillRect(0, 0, selfWidth, selfHeight);
    ctx.globalAlpha = .8;
    ctx.font = '16px sans-serif';

    for (let _i = 0; _i < 10; _i++) {
        ctx.fillStyle = 'rgb(' + randInt(150, 225) + ',' + randInt(150, 225) + ',' + randInt(150, 225) + ')';
    }

    ctx.font = 'bold 32px sans-serif';
    for (let i = 0; i < 4; i++) {
        const temp_index = randInt(0, temp.length);
        ctx.fillStyle = color;
        ctx.fillText(temp[temp_index], 5 + i * 20, 25);
        // ctx.transform(randFloat(0.85, 1.0), randFloat(-0.04, 0), randFloat(-0.3, 0.3), randFloat(0.85, 1.0), 0, 0);
        vCode += temp[temp_index];
    }

    ctx.beginPath();
    ctx.strokeStyle = color;
    const b = randFloat(selfHeight / 4, 3 * selfHeight / 4);
    const f = randFloat(selfHeight / 4, 3 * selfHeight / 4);
    const w = 2 * Math.PI / (randFloat(selfHeight * 1.5, selfWidth));

    function linePoint(x: number) {
        return randFloat(10, selfHeight / 2) * Math.sin(w * x + f) + b;
    };

    ctx.lineWidth = 5;
    for (let x = -20; x < 200; x += 20) {
        ctx.moveTo(x, linePoint(x));
        ctx.lineTo(x + 3, linePoint(x + 3));
    }
    ctx.closePath();
    ctx.stroke();

    return {
        code: vCode.toLowerCase(),
        dataURL: canvas.toDataURL()
    };
};

/**
 * 随机获得一个范围内的浮点数
 * @param start
 * @param end
 * @returns {*}
 */
function randFloat(start: number, end: number) {
    return start + Math.random() * (end - start);
}

/**
 * 随机获得一个范围内的整数
 * @param start
 * @param end
 * @returns {*}
 */
function randInt(start: number, end: number) {
    return Math.floor(Math.random() * (end - start)) + start;
}