from typing import ClassVar, Final, Unpack, override


foo: Final = int()
bar: str = ""
baz: Final[str] = ""

class Foo:
    a: ClassVar = "asdf"
    b: ClassVar[str] = "asdf"

_ = list([1])

class Foo[T]:
    def __init__(self, value: T) -> None:
        self.value = value

    def foo(self) -> None: ...

_ = Foo(True)

_ = tuple((1,2,3))

class Bar[U, *T]:
    def __init__(self, asdf: U,*value: Unpack[T]) -> None:
        pass

_ = Bar([1], 1,2,"")

class Baz(Foo[int]):
    @override
    def foo(self) -> None:
        return super().foo()
