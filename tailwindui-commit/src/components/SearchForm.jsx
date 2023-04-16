import { useId, useState } from 'react'

import { remark } from 'remark'
import html from 'remark-html'
import clsx from 'clsx'

const DEV_URL = 'http://fastapi.localhost:8008/query/react'
const PROD_URL = 'https://api.hosting.builders/query/react'

const useFetchData = () => {
  const [isLoading, setLoading] = useState(false)
  const [results, setResults] = useState([])

  const fetchData = async (text) => {
    setLoading(true)
    const data = await fetch(DEV_URL, {
      method: 'POST',
      body: JSON.stringify({
        text,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        throw res.text()
      })
      .finally(() => {
        setLoading(false)
      })

    const items = data.items

    const itemsWithHtml = await Promise.all(
      items.map((item) =>
        remark()
          .use(html)
          .process(item.content)
          .then((r) => ({ ...item, htmlContent: r.value }))
      )
    )
    setResults(itemsWithHtml)
  }
  return {
    isLoading,
    results,
    fetchData,
  }
}

const getHeadingText = (it) => {
  const [file, ...path] = it.headings
  const cleanPath = path.map((it) => {
    const firstBlockStart = it.indexOf('{')
    return it.slice(0, firstBlockStart - 1)
  })
  return [file.replace('docs/react/', ''), cleanPath.join(' > ')]
}

const RenderSearchResults = ({ results }) => {
  return (
    <>
      {results.map((it, idx) => {
        const [path, heading] = getHeadingText(it)
        return (
          <>
            <h2>
              {idx + 1} -{' '}
              <a
                href={
                  'https://github.com/reactjs/react.dev/tree/main/src/content/' +
                  path
                }
                target="_blank"
              >
                {path}
              </a>
            </h2>
            <h3>{heading}</h3>
            <div dangerouslySetInnerHTML={{ __html: it.htmlContent }} />
          </>
        )
      })}
    </>
  )
}

function ButtonInner({ children }) {
  return (
    <>
      <span className="absolute inset-0 rounded-md bg-gradient-to-b from-black/80 to-black opacity-10 transition-opacity group-hover:opacity-15 dark:from-white/80 dark:to-white" />
      <span className="absolute inset-0 rounded-md opacity-7.5 shadow-[inset_0_1px_1px_black] transition-opacity group-hover:opacity-10 dark:shadow-[inset_0_1px_1px_white]" />
      {children} <span aria-hidden="true">&rarr;</span>
    </>
  )
}

function Button({ className, children, isLoading, ...props }) {
  className = clsx(
    className,
    'group relative isolate flex-none rounded-md py-1.5 text-[0.8125rem]/6 font-semibold text-black dark:text-white',
    'pl-2.5 pr-[calc(9/16*1rem)]'
  )

  return (
    <button className={className} {...props}>
      <ButtonInner>{children}</ButtonInner>
    </button>
  )
}

export function SearchForm() {
  let id = useId()
  const placeholder = 'Search ReactJS Documentation'
  const [value, setValue] = useState('')
  const { isLoading, results, fetchData } = useFetchData()

  return (
    <>
      <form
        className="relative isolate mt-8 flex items-center pr-1"
        onSubmit={(ev) => {
          ev.preventDefault()
          fetchData(value)
        }}
      >
        <label htmlFor={id} className="sr-only">
          {placeholder}
        </label>
        <input
          required
          name="search-input"
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(ev) => setValue(ev.target.value)}
          className="peer w-0 flex-auto bg-transparent px-4 py-2.5 text-base text-black placeholder:text-gray-600 focus:outline-none dark:text-white dark:placeholder:text-gray-500 sm:text-[0.8125rem]/6"
        />
        <Button isLoading={isLoading} type="submit">
          Submit
        </Button>
        <div className="absolute inset-0 -z-10 rounded-lg transition peer-focus:ring-4 peer-focus:ring-sky-300/15" />
        <div className="absolute inset-0 -z-10 rounded-lg bg-black/2.5 ring-1 ring-black/15 transition peer-focus:ring-sky-300 dark:bg-white/2.5 dark:ring-white/15" />
      </form>
      <RenderSearchResults results={results} />
    </>
  )
}
