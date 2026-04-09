type AppTitleProps = {
  title: string;
};

function AppTitle({ title }: AppTitleProps) {
  return <h1 className="app-title">{title}</h1>;
}

export default AppTitle;
