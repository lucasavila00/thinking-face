import { useId, useState, Fragment } from 'react'

import { remark } from 'remark'
import html from 'remark-html'
import clsx from 'clsx'

const useFetchData = () => {
  const [isLoading, setLoading] = useState(false)
  const [results, setResults] = useState([])

  const fetchData = async (text) => {
    setLoading(true)
    const data = await fetch(process.env.NEXT_PUBLIC_API_URL, {
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

    const items = await Promise.all(
      data.items.map((item) =>
        remark()
          .use(html)
          .process(item.content)
          .then((r) => ({ ...item, htmlContent: r.value }))
      )
    )
    setResults(items)
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
          <Fragment key={idx}>
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
          </Fragment>
        )
      })}
    </>
  )
}

function ButtonInner({ arrow, children }) {
  return (
    <>
      <span className="absolute inset-0 rounded-md bg-gradient-to-b from-black/80 to-black opacity-10 transition-opacity group-hover:opacity-15 dark:from-white/80 dark:to-white" />
      <span className="absolute inset-0 rounded-md opacity-7.5 shadow-[inset_0_1px_1px_black] transition-opacity group-hover:opacity-10 dark:shadow-[inset_0_1px_1px_white]" />
      {children} {arrow ? <span aria-hidden="true">&rarr;</span> : null}
    </>
  )
}

function Button({ className, arrow, children, ...props }) {
  className = clsx(
    className,
    'group relative isolate flex-none rounded-md py-1.5 text-[0.8125rem]/6 font-semibold text-black dark:text-white',
    arrow ? 'pl-2.5 pr-[calc(9/16*1rem)]' : 'px-2.5'
  )

  return (
    <button className={className} {...props}>
      <ButtonInner arrow={arrow}>{children}</ButtonInner>
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
        <Button disabled={isLoading} type="submit" arrow={!isLoading}>
          {isLoading ? (
            <>
              <svg
                aria-hidden="true"
                role="status"
                className="mr-2 inline h-4 w-4 animate-spin text-black dark:text-white"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="#E5E7EB"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentColor"
                />
              </svg>
              Loading...
            </>
          ) : (
            <>Submit</>
          )}
        </Button>
        <div className="absolute inset-0 -z-10 rounded-lg transition peer-focus:ring-4 peer-focus:ring-sky-300/15" />
        <div className="absolute inset-0 -z-10 rounded-lg bg-black/2.5 ring-1 ring-black/15 transition peer-focus:ring-sky-300 dark:bg-white/2.5 dark:ring-white/15" />
      </form>
      <RenderSearchResults results={results} />
    </>
  )
}
