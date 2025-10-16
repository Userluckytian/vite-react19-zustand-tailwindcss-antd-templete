import { useEffect, useRef, useCallback } from "react"
import './index.scss';

interface DotParticleCanvasProps {
    backgroundColor?: string
    particleColor?: string
    animationSpeed?: number
    containerWidth: number
    containerHeight: number
}

const DotParticleCanvas = ({
    backgroundColor = "transparent", // 直接使用 transparent
    particleColor = "100, 100, 100",
    animationSpeed = 0.6,
}: DotParticleCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const requestIdRef = useRef<number | null>(null)
    const timeRef = useRef<number>(0)
    const mouseRef = useRef({ x: 0, y: 0, isDown: false })
    const dprRef = useRef<number>(1)

    // 自定义表情字符数组
    const emojis = useRef([
        "😀", "🤣", "❤️", "😻", "👏", "🤘", "🤡", "🤩", "👍🏼", "🐮", "🎈",
        "💕", "💓", "💚"
    ])

    const particles = useRef<
        Array<{
            x: number
            y: number
            vx: number
            vy: number
            life: number
            maxLife: number
            size: number
            angle: number
            speed: number
            emoji: string
        }>
    >([])

    const resizeCanvas = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const dpr = window.devicePixelRatio || 1
        dprRef.current = dpr

        const container = canvas.parentElement; // 或者通过ref获取外部div元素

        const displayWidth = container.clientWidth;
        const displayHeight = container.clientHeight;

        canvas.width = displayWidth * dpr
        canvas.height = displayHeight * dpr

        canvas.style.width = displayWidth + "px"
        canvas.style.height = displayHeight + "px"

        const ctx = canvas.getContext("2d")
        if (ctx) {
            ctx.scale(dpr, dpr)
        }
    }, [])

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        mouseRef.current.x = e.clientX - rect.left
        mouseRef.current.y = e.clientY - rect.top
    }, [])

    const handleMouseDown = useCallback((e: MouseEvent) => {
        mouseRef.current.isDown = true
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Create beautiful particle burst at click location
        const numParticles = 25 + Math.random() * 15

        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles + (Math.random() - 0.5) * 0.5
            const speed = 2 + Math.random() * 4
            const size = 12 + Math.random() * 8

            const randomEmoji = emojis.current[Math.floor(Math.random() * emojis.current.length)]

            particles.current.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0,
                maxLife: 2000 + Math.random() * 3000,
                size: size,
                angle: angle,
                speed: speed,
                emoji: randomEmoji,
            })
        }

        // Add some slower, larger particles for variety
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2
            const speed = 0.5 + Math.random() * 1.5

            const randomEmoji = emojis.current[Math.floor(Math.random() * emojis.current.length)]

            particles.current.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0,
                maxLife: 4000 + Math.random() * 2000,
                size: 16 + Math.random() * 8,
                angle: angle,
                speed: speed,
                emoji: randomEmoji,
            })
        }
    }, [])

    const handleMouseUp = useCallback(() => {
        mouseRef.current.isDown = false
    }, [])

    const animate = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        timeRef.current += animationSpeed

        const width = canvas.clientWidth
        const height = canvas.clientHeight

        // 只使用 clearRect 来清除画布，实现透明背景
        ctx.clearRect(0, 0, width, height)

        // Update and draw particles
        particles.current = particles.current.filter((particle) => {
            particle.life += 16
            particle.x += particle.vx
            particle.y += particle.vy

            // Apply gentle physics
            particle.vy += 0.02
            particle.vx *= 0.995
            particle.vy *= 0.995

            // Add some organic movement
            const organicX = Math.sin(timeRef.current + particle.angle) * 0.3
            const organicY = Math.cos(timeRef.current + particle.angle * 0.7) * 0.2
            particle.x += organicX
            particle.y += organicY

            // Calculate alpha and size based on life
            const lifeProgress = particle.life / particle.maxLife
            const alpha = Math.max(0, (1 - lifeProgress) * 1.0) // 改为 1.0 让表情更清晰
            const currentSize = particle.size * (1 - lifeProgress * 0.3)

            // Draw emoji instead of circle
            if (alpha > 0) {
                ctx.save()
                ctx.globalAlpha = alpha
                ctx.font = `${currentSize}px Arial, sans-serif`
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(particle.emoji, particle.x, particle.y)
                ctx.restore()
            }

            return (
                particle.life < particle.maxLife &&
                particle.x > -50 &&
                particle.x < width + 50 &&
                particle.y > -50 &&
                particle.y < height + 50
            )
        })

        requestIdRef.current = requestAnimationFrame(animate)
    }, [animationSpeed]) // 移除 backgroundColor 依赖

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        resizeCanvas()

        const handleResize = () => resizeCanvas()

        window.addEventListener("resize", handleResize)
        canvas.addEventListener("mousemove", handleMouseMove)
        canvas.addEventListener("mousedown", handleMouseDown)
        canvas.addEventListener("mouseup", handleMouseUp)

        animate()

        return () => {
            window.removeEventListener("resize", handleResize)
            canvas.removeEventListener("mousemove", handleMouseMove)
            canvas.removeEventListener("mousedown", handleMouseDown)
            canvas.removeEventListener("mouseup", handleMouseUp)

            if (requestIdRef.current) {
                cancelAnimationFrame(requestIdRef.current)
                requestIdRef.current = null
            }
            timeRef.current = 0
            particles.current = []
        }
    }, [animate, resizeCanvas, handleMouseMove, handleMouseDown, handleMouseUp])

    return  <canvas ref={canvasRef} className="HBCanvas" />
}

export default DotParticleCanvas