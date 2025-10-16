/** 睡眠
 * 
 * @param time 
 * @returns 
 */
function sleep(time: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}


/** 基于图片生成base64编码（异步函数）
 * 
 * @param num 
 * @param imgPath 
 * @returns 
 */
async function buildBase64Image(num: number, imgPath: string = './no_num_red.png') {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            reject(new Error("Canvas 2D context not supported"));
            return;
        }

        const img = new Image();
        img.onload = () => {
            try {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                ctx.font = "26px Arial";
                ctx.fillStyle = "#fff";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(num.toString(), img.width / 2 - 1, img.height / 2 - 5);
                resolve(canvas.toDataURL("image/png"));
            } catch (error) {
                reject(error);
            }
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imgPath;
    });
}

/** 
 * 防抖动逻辑
 * 防抖函数原理：把触发非常频繁的事件合并成一次去执行 在指定时间内只执行一次回调函数，如果在指定的时间内又触发了该事件，则回调函数的执行时间会基于此刻重新开始计算
 * func是用户传入需要防抖的函数
 * wait是等待时间
*/
function debounce(func, wait = 100) {
    // 缓存一个定时器id
    let timer: any = null;
    // 这里返回的函数是每次用户实际调用的防抖函数
    // 如果已经设定过定时器了就清空上一次的定时器
    // 开始一个新的定时器，延迟执行用户传入的方法
    return function (...args) {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
            func.apply(this, args)
        }, wait)
    }
}


// 节流函数原理:指频繁触发事件时，只会在指定的时间段内执行事件回调，即触发事件间隔大于等于指定的时间才会执行回调函数。总结起来就是：事件，按照一段时间的间隔来进行触发。
// 时间戳方式：
// func是用户传入需要防抖的函数
// wait是等待时间
function throttle(func, wait = 50) {
    // 上一次执行该函数的时间
    let lastTime = 0
    return function (...args) {
        // 当前时间
        let now = +new Date()
        // 将当前时间和上一次执行函数时间对比
        // 如果差值大于设置的等待时间就执行函数
        if (now - lastTime > wait) {
            lastTime = now
            func.apply(this, args)
        }
    }
}

/** 格式化数字
 * 
 * @param num 
 * @param toFixedNum 
 * @returns 
 */
function formatNumber(num: number, toFixedNum: number = 2) {
    const isInterger = Number.isInteger(num);
    if (isInterger) {
        return num;
    } else {
        return Number(num.toFixed(toFixedNum));
    }
}


export {
    sleep,
    formatNumber,
    buildBase64Image,
    throttle,
    debounce
}