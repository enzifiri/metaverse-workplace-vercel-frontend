import React, { useEffect, useState } from 'react'
import Router from 'next/router'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import io from 'socket.io-client'
import Sidebar from '../components/sidebar'
import { Vector } from '../libs/movement'
import { Logger } from '../libs/lib'

const Me = dynamic(() => import('../components/me'), { ssr: false })
const Mate = dynamic(() => import('../components/mate'), { ssr: false })

// init socket.io client
const ws = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL, {
    reconnectionDelayMax: 10000,
    transports: ['websocket'],
    reconnection: false,
    autoConnect: false,
})

const log = new Logger('Index', 'color: green; background: yellow')

export default function Index() {
    const [logged, setLogged] = useState(false)
    const [onlineState, setOnlineState] = useState(false)
    const [me, setMe] = useState(null)
    const [mates, setMates] = useState([])

    useEffect(() => {
        const accessToken = localStorage.getItem(process.env.NEXT_PUBLIC_ACCESSTOKENKEY)
        if (!accessToken) {
            Router.push('/login')
            return
        }
        setLogged(true)
    }, [])

    useEffect(() => {
        if (logged) {
            const u = localStorage.getItem(process.env.NEXT_PUBLIC_USERKEY)
            const me = JSON.parse(u)

            setMe(me)

            log.log('me: ', me)

            // `online` event will be occured when user is connected to websocket
            ws.on('online', mate => {
                if (mate.name == me.login) {
                    log.log('[online] is Me, ignore', me.login)
                    return
                }
                mate.key = mate.name
                mate.pos = new Vector(15, 15)
                setMates(arr => [...arr, mate])
                log.log('[online] over: ', mates.length)
            })

            // `offline` event will be occured when other users leave
            ws.on('offline', mate => {
                log.log('[offline]', mate.name)
                setMates(arr => arr.filter(p => p.name != mate.name))
                log.log('[offline] counts: ', mates.length)
            })

            ws.on('ask', p => {
                log.log('[ask]', p)
            })

            ws.on('movement', mv => {
                log.log('[movement]', mv)
            })

            ws.on('sync', state => {
                log.log('[sync]', state, ', Me:', me.login)
                if (state.name == me.login) {
                    log.log('[sync] is Me, ignore', me.login)
                    return
                }

                setMates(arr => {
                    let shouldAdd = arr.every(p => {
                        if (p.name == state.name) {
                            return false
                        }
                        return true
                    })
                    if (shouldAdd) {
                        log.log('[sync] add', state)
                        state.key = state.name
                        return [...arr, state]
                    }
                    return arr
                })
            })

            // broadcast to others I am online when WebSocket connected
            ws.on('connect', () => {
                log.log('WS CONNECTED', ws.id, ws.connected)
                ws.emit('online', { name: me.login, avatar: me.avatar })
                setOnlineState(true)
            })

            ws.on('disconnect', (reason) => {
                console.error('WS DISCONNECT', reason)
                setOnlineState(false)
            })

            ws.on('connect_error', (error) => {
                console.error('WS CONNECT_ERROR', error)
                setOnlineState(false)
            })

            return () => {
                ws.disconnect('bye')
            }
        }
    }, [logged])

    if (!me) {
        return null
    }

    return (
        <>
            <Head>
                <title>Open-source Virtual HQ with Geo-distributed System Tech Stacks</title>
            </Head>
            <Sidebar onlineState={onlineState} count={mates.length + 1} />
            <section>
                {mates.map(m => (
                    <Mate
                        key={m.name}
                        sock={ws}
                        name={m.name}
                        pos={m.pos}
                        avatar={m.avatar}
                    />
                ))}
                <Me
                    sock={ws}
                    name={me.login}
                    avatar={me.avatar}
                    initPos={{ x: 30, y: 0 }}
                />
            </section>
        </>
    )
}
