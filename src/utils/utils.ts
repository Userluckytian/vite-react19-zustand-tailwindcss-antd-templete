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


export {
    sleep,
    buildBase64Image
}