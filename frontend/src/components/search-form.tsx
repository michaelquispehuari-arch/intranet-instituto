type SearchFormProps = {
  value: string;
  placeholder: string;
};

export function SearchForm({ value, placeholder }: SearchFormProps) {
  return (
    <form className="search-form" action="" method="get">
      <label className="field">
        <span>Buscar</span>
        <input name="q" defaultValue={value} placeholder={placeholder} />
      </label>
      <button className="button secondary" type="submit">
        Filtrar
      </button>
    </form>
  );
}
