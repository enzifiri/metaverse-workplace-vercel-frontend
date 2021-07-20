import React, { useEffect, useState, useCallback } from 'react'
import Router from 'next/router'
import request from '../libs/request'
import Spin from '../components/spin'

function getQueryString(name) {
    const reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)')
    const r = window.location.search.substr(1).match(reg)
    if (r != null) {
        return unescape(r[2])
    }
    return null
}

export default function Login() {
    const [loading, setLoading] = useState(true)
    const [isDev, setIsDev] = useState(false)

    useEffect(() => {
        if (process.env.NODE_ENV == 'development') {
            setIsDev(true)
        }

        const code = getQueryString('code')

        if (!code) {
            setLoading(false)
            return null
        }

        request({
            url: `${process.env.NEXT_PUBLIC_SITEURL}/api/login`,
            method: 'get',
            params: {
                code
            }
        }).then(tokenRes => {
            const accessToken = tokenRes.access_token
            request({
                url: 'https://api.github.com/user',
                method: 'get',
                headers: {
                    'accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${accessToken}`
                },
            }).then(userRes => {
                request({
                    url: `${process.env.NEXT_PUBLIC_SITEURL}/api/user`,
                    method: 'post',
                    data: {
                        accessToken,
                        login: userRes.login,
                        name: userRes.name,
                        avatar: userRes.avatar_url
                    }
                }).then(res => {
                    const user = {
                        login: userRes.login,
                        name: userRes.name,
                        avatar: userRes.avatar_url,
                    }
                    localStorage.setItem(process.env.NEXT_PUBLIC_ACCESSTOKENKEY, accessToken)
                    localStorage.setItem(process.env.NEXT_PUBLIC_USERKEY, JSON.stringify(user))
                    Router.push('/')
                }).catch(error => {

                })
            }).catch(error => {

            })
        }).catch(error => {

        })
    }, [])

    const handleDevLogin = useCallback(e => {
        localStorage.setItem(process.env.NEXT_PUBLIC_ACCESSTOKENKEY, 'token')
        localStorage.setItem(process.env.NEXT_PUBLIC_USERKEY, JSON.stringify({
            login: 'xile',
            avatar: './xilelogo.png',
        }))
        Router.push('/')
    }, [])

    return (
        <>
            {
                loading
                    ? (
                        <div className='fixed top-0 left-0 right-0 bottom-0 bg-gray-100 z-50 flex justify-center items-center'>
                            <Spin />
                            <span className='ml-2.5 text-base'>loading...</span>
                        </div>
                    )
                    : isDev ? (
                        <div className='w-screen h-screen flex flex-col items-center justify-center'>
                            <div
                                className='px-4 py-2 rounded-lg bg-blue-900 text-xl text-white cursor-pointer hover:bg-blue-800'
                                onClick={handleDevLogin}
                            >
                                Login with GitHub
                            </div>
                        </div>
                    ) : (
                        <div className='w-screen h-screen flex flex-col items-center justify-center'>
                            <a
                                className='px-4 py-2 rounded-lg bg-blue-900 text-xl text-white no-underline hover:bg-blue-800'
                                role='button'
                                href={`https://github.com/login/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_SITEURL}/login`}
                            >
                                Login with GitHub
                            </a>
                        </div>
                    )
            }
        </>
    )
}
